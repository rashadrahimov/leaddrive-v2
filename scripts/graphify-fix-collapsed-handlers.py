#!/usr/bin/env python3
"""
Post-process graphify graph.json to split god-nodes created by colliding
file stems in Next.js conventions (route.ts / page.tsx / layout.tsx).

Background: graphify's AST extractor uses `<file_stem>_<func_name>` as
the node id (extract.py:342). For Next.js, every API route is a file
named `route.ts` and every page is `page.tsx`, so all `POST` handlers
across the entire app collapse into a single `route_post` node with
hundreds of false-bridge edges. This script re-extracts each such file
individually, prefixes its node ids with a sanitized directory path, and
rewires every edge that pointed at the collapsed node so it now points
at the correct file-specific node instead.

Run:
    python3 scripts/graphify-fix-collapsed-handlers.py
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GRAPH = REPO / "graphify-out" / "graph.json"

# Next.js convention filenames whose stems collide across directories.
NEXT_STEMS = {"route", "page", "layout", "loading", "error", "not-found", "default", "template", "head"}

# Activate graphify's interpreter
PYTHON = (REPO / "graphify-out" / ".graphify_python").read_text().strip()
if Path(PYTHON).resolve() != Path(sys.executable).resolve():
    import os
    os.execv(PYTHON, [PYTHON, __file__, *sys.argv[1:]])

import networkx as nx
from networkx.readwrite import json_graph
from graphify.extract import extract


def sanitize(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()


def find_next_files(root: Path) -> list[Path]:
    out = []
    for p in (root / "src" / "app").rglob("*"):
        if p.is_file() and p.stem in NEXT_STEMS and p.suffix in {".ts", ".tsx", ".js", ".jsx"}:
            out.append(p)
    return out


def main():
    print(f"Loading {GRAPH} ...")
    G = json_graph.node_link_graph(json.loads(GRAPH.read_text()), edges="links")
    before_n, before_e = G.number_of_nodes(), G.number_of_edges()

    files = find_next_files(REPO)
    print(f"Re-extracting {len(files)} Next.js convention files individually with namespaced ids...")

    # Map: collapsed_id -> { source_file -> new_unique_id }
    # We discover collapsed nodes by re-extracting each file alone.
    # Each per-file extract gives us local node ids; we rewrite to namespaced.
    rewrites: dict[tuple[str, str], str] = {}  # (collapsed_id, source_file) -> new_id
    new_nodes: dict[str, dict] = {}

    for i, fp in enumerate(files, 1):
        rel = fp.relative_to(REPO)
        ns_prefix = sanitize(str(rel.parent))  # "src_app_api_v1_invoices"
        try:
            r = extract([fp])
        except Exception as e:
            print(f"  [warn] extract failed for {rel}: {e}")
            continue
        for n in r.get("nodes", []):
            old_id = n["id"]
            new_id = f"{ns_prefix}__{old_id}"
            n_copy = dict(n)
            n_copy["id"] = new_id
            n_copy["source_file"] = str(rel)
            new_nodes[new_id] = n_copy
            rewrites[(old_id, str(rel))] = new_id

        if i % 50 == 0 or i == len(files):
            print(f"  Re-extracted {i}/{len(files)}")

    # Identify collapsed god-node ids: any old_id that maps to multiple new_ids
    from collections import defaultdict
    by_old = defaultdict(set)
    for (old_id, src), new_id in rewrites.items():
        by_old[old_id].add(new_id)
    collapsed = {old_id for old_id, new_ids in by_old.items() if len(new_ids) > 1}
    print(f"Found {len(collapsed)} collapsed node ids (each split into 2+ namespaced nodes)")

    # Add new namespaced nodes to the graph
    added = 0
    for new_id, attrs in new_nodes.items():
        if new_id not in G:
            G.add_node(new_id, **{k: v for k, v in attrs.items() if k != "id"})
            added += 1
    print(f"Added {added} new namespaced nodes")

    # Rewire edges: any edge touching a collapsed_id whose other endpoint is a
    # node from a Next.js file gets re-pointed at the namespaced version.
    # Strategy: for each edge (u, v), if either endpoint is collapsed and the
    # opposite endpoint's source_file is a Next.js convention file (or shares
    # that file's parent), rewire to the namespaced id derived from that file.
    edges_to_add: list[tuple[str, str, dict]] = []
    edges_to_remove: list[tuple[str, str]] = []

    for u, v, data in G.edges(data=True):
        u_collapsed = u in collapsed
        v_collapsed = v in collapsed
        if not (u_collapsed or v_collapsed):
            continue

        # Try to find a rewrite using the source_file of the OPPOSITE end.
        def resolve(side_collapsed_id, opposite_node_id):
            opp = G.nodes.get(opposite_node_id, {})
            opp_src = opp.get("source_file")
            if not opp_src:
                return None
            # Walk up dirs of opp_src until a (collapsed_id, src) lookup hits
            opp_path = Path(opp_src)
            for _ in range(8):
                key = (side_collapsed_id, str(opp_path))
                if key in rewrites:
                    return rewrites[key]
                if opp_path.parent == opp_path:
                    break
                opp_path = opp_path.parent
            return None

        new_u = resolve(u, v) if u_collapsed else u
        new_v = resolve(v, u) if v_collapsed else v
        if new_u and new_v and (new_u != u or new_v != v):
            edges_to_add.append((new_u, new_v, data))
            edges_to_remove.append((u, v))

    print(f"Rewiring {len(edges_to_add)} edges; removing {len(edges_to_remove)} originals")
    G.remove_edges_from(edges_to_remove)
    for u, v, data in edges_to_add:
        G.add_edge(u, v, **data)

    # Drop collapsed god-nodes that are now isolated AND their original
    # source_file is one of the per-file re-extracts (so we have replacements).
    # Keep them only if they still legitimately represent something (e.g. the
    # very first file they were extracted from also has a namespaced version,
    # and removing them would orphan unrelated edges — handled by isolated check).
    removed = 0
    for cid in list(collapsed):
        if cid in G and G.degree(cid) == 0:
            G.remove_node(cid)
            removed += 1
    print(f"Removed {removed} now-isolated collapsed nodes")

    after_n, after_e = G.number_of_nodes(), G.number_of_edges()
    print(f"Graph: {before_n} -> {after_n} nodes ({after_n - before_n:+d}), "
          f"{before_e} -> {after_e} edges ({after_e - before_e:+d})")

    # Persist
    data = json_graph.node_link_data(G, edges="links")
    GRAPH.write_text(json.dumps(data, indent=2))
    print(f"Wrote {GRAPH}")

    # Sanity check: how concentrated is POST() now?
    post_nodes = [(n, d) for n, d in G.nodes(data=True) if d.get("label") == "POST()"]
    print(f"POST() nodes after fix: {len(post_nodes)} (was 1)")
    top = sorted(post_nodes, key=lambda x: -G.degree(x[0]))[:5]
    for n, d in top:
        print(f"  {n} (deg {G.degree(n)}) -> {d.get('source_file')}")


if __name__ == "__main__":
    main()
