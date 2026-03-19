'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

const fields = [
  { id: 1, name: 'Industry', entity: 'Contact', type: 'select' },
  { id: 2, name: 'Company Size', entity: 'Contact', type: 'text' },
  { id: 3, name: 'Deal Value', entity: 'Deal', type: 'number' },
];

export default function CustomFieldsPage() {
  const [selectedEntity, setSelectedEntity] = useState('contact');

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

        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{field.name}</p>
                <p className="text-sm text-muted-foreground">{field.entity}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{field.type}</Badge>
                <Button variant="ghost" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
