'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface CustomField {
  id: string;
  entityType: string;
  fieldLabel: string;
  fieldType: string;
}

export default function CustomFieldsPage() {
  const { data: session } = useSession();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [selectedEntity, setSelectedEntity] = useState('contact');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchFields = async () => {
      try {
        const response = await fetch(`/api/v1/custom-fields?entityType=${selectedEntity}`);
        if (response.ok) {
          const result = await response.json();
          setFields(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchFields();
  }, [session, selectedEntity]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground mt-2">Create and manage custom fields for your entities</p>
        </div>
        <Button>Add Field</Button>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <label className="text-sm font-medium block mb-2">Select Entity</label>
          <div className="flex gap-2">
            {['contact', 'deal', 'company'].map((entity) => (
              <Button
                key={entity}
                variant={selectedEntity === entity ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEntity(entity)}
              >
                {entity.charAt(0).toUpperCase() + entity.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-3">
            {fields.length === 0 ? (
              <p className="text-muted-foreground">No custom fields for this entity</p>
            ) : (
              fields.map((field) => (
                <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{field.fieldLabel}</p>
                    <p className="text-sm text-muted-foreground">{field.entityType}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{field.fieldType}</Badge>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
