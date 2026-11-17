import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSquadSchema, type CreateSquadFormData } from './schema';
import { squadApi } from './api';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Shield, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export function SquadNewPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdSquadId, setCreatedSquadId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSquadFormData>({
    resolver: zodResolver(createSquadSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: CreateSquadFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const squadId = await squadApi.createSquad(data.name, data.description);
      setCreatedSquadId(squadId);
      window.location.href = `/squads/${squadId}`;
    } catch (err: unknown) {
      setIsSubmitting(false);
      setServerError(
        err instanceof Error ? err.message : 'Failed to create squad. Please try again.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Squad"
        description="Establish a permanent football squad for your turf friend group or local club."
        badge="Squads"
      />

      <div className="max-w-2xl mx-auto">
        <Card className="border-border bg-surface shadow-modal">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold">Squad Information</CardTitle>
                <CardDescription>
                  You will automatically become the squad owner with a private room code.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {serverError && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {createdSquadId && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Squad created successfully! Redirecting...</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                label="Squad Name"
                htmlFor="name"
                error={errors.name?.message}
                required
              >
                <Input
                  id="name"
                  placeholder="e.g. Kozhikode Strikers, Aluva FC"
                  {...register('name')}
                />
              </FormField>

              <FormField
                label="Description & Home Turf (Optional)"
                htmlFor="description"
                error={errors.description?.message}
              >
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="e.g. Weekly Friday night 7v7 friendlies at Decathlon Kalamassery."
                  {...register('description')}
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (window.location.href = '/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  <span>Create Squad</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
