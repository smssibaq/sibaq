import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useSampleItems,
  useCreateSampleItem,
  useUpdateSampleItem,
  useDeleteSampleItem,
} from './api';
import { sampleItemFormSchema, type SampleItemFormData } from './schema';
import type { SampleItem } from './types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { FormField } from '../../components/ui/form-field';
import { Badge } from '../../components/ui/badge';
import { Dialog } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { EmptyState } from '../../components/common/empty-state';
import { ErrorState } from '../../components/common/error-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useToast } from '../../components/ui/toast';
import { Plus, Search, Edit2, Trash2, Layers } from 'lucide-react';
import { formatDate } from '../../lib/dates';

export function SampleItemsPage() {
  const { toast } = useToast();
  const { data: items, isLoading, isError, error, refetch } = useSampleItems();

  const createMutation = useCreateSampleItem();
  const updateMutation = useUpdateSampleItem();
  const deleteMutation = useDeleteSampleItem();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SampleItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form for create
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<SampleItemFormData>({
    resolver: zodResolver(sampleItemFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'active',
    },
  });

  // Form for edit
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<SampleItemFormData>({
    resolver: zodResolver(sampleItemFormSchema),
  });

  const handleOpenEdit = (item: SampleItem) => {
    setEditingItem(item);
    resetEdit({
      title: item.title,
      description: item.description || '',
      status: item.status,
    });
  };

  const onSubmitCreate = async (data: SampleItemFormData) => {
    try {
      await createMutation.mutateAsync({
        title: data.title,
        description: data.description,
        status: data.status,
      });
      toast.success('Item created', `"${data.title}" was saved successfully.`);
      resetCreate();
      setIsCreateOpen(false);
    } catch (err: unknown) {
      toast.error(
        'Creation failed',
        err instanceof Error ? err.message : 'Failed to create item.'
      );
    }
  };

  const onSubmitEdit = async (data: SampleItemFormData) => {
    if (!editingItem) return;

    try {
      await updateMutation.mutateAsync({
        id: editingItem.id,
        input: {
          title: data.title,
          description: data.description,
          status: data.status,
        },
      });
      toast.success('Item updated', 'Changes have been applied.');
      setEditingItem(null);
    } catch (err: unknown) {
      toast.error(
        'Update failed',
        err instanceof Error ? err.message : 'Failed to update item.'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;

    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success('Item removed', 'Record has been permanently deleted.');
      setDeletingId(null);
    } catch (err: unknown) {
      toast.error(
        'Deletion failed',
        err instanceof Error ? err.message : 'Failed to delete record.'
      );
    }
  };

  const filteredItems = (items || []).filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Removable Demo</Badge>
            <span className="text-xs text-muted-foreground">Sample CRUD Module</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1.5">
            Sample Items
          </h2>
          <p className="text-sm text-muted-foreground">
            Demonstrates end-to-end Supabase queries, mutations, Zod validation, and RLS policies.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create New Item
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sample items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-muted-foreground">
          Loading sample items...
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to Load Items"
          message={error instanceof Error ? error.message : 'Database query failed.'}
          onRetry={() => refetch()}
        />
      ) : filteredItems.length === 0 ? (
        searchQuery ? (
          <EmptyState
            title="No Results Found"
            description={`No items match your search term "${searchQuery}".`}
            isSearchEmpty
            actionText="Clear Search Filter"
            onAction={() => setSearchQuery('')}
          />
        ) : (
          <EmptyState
            title="No Items Yet"
            description="Your sample database table is empty. Create your first record to test RLS and mutations."
            icon={<Layers className="h-6 w-6 text-primary" />}
            actionText="Create Sample Item"
            onAction={() => setIsCreateOpen(true)}
          />
        )
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold text-foreground">
                    {item.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                    {item.description || '—'}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(item.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        aria-label={`Edit ${item.title}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger"
                        onClick={() => setDeletingId(item.id)}
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Modal Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Sample Item"
        description="Fill out the fields below. Validated with Zod before submission."
      >
        <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-4">
          <FormField
            label="Title"
            htmlFor="create-title"
            required
            error={createErrors.title?.message}
          >
            <Input
              id="create-title"
              placeholder="e.g. Design User Flow"
              isInvalid={Boolean(createErrors.title)}
              {...registerCreate('title')}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="create-desc"
            error={createErrors.description?.message}
          >
            <Textarea
              id="create-desc"
              placeholder="Optional notes or details"
              isInvalid={Boolean(createErrors.description)}
              {...registerCreate('description')}
            />
          </FormField>

          <FormField
            label="Status"
            htmlFor="create-status"
            required
            error={createErrors.status?.message}
          >
            <Select id="create-status" {...registerCreate('status')}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Record
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Modal Dialog */}
      <Dialog
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Edit Sample Item"
        description="Update the item attributes."
      >
        <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-4">
          <FormField
            label="Title"
            htmlFor="edit-title"
            required
            error={editErrors.title?.message}
          >
            <Input
              id="edit-title"
              isInvalid={Boolean(editErrors.title)}
              {...registerEdit('title')}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="edit-desc"
            error={editErrors.description?.message}
          >
            <Textarea
              id="edit-desc"
              isInvalid={Boolean(editErrors.description)}
              {...registerEdit('description')}
            />
          </FormField>

          <FormField
            label="Status"
            htmlFor="edit-status"
            required
            error={editErrors.status?.message}
          >
            <Select id="edit-status" {...registerEdit('status')}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingItem(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Record"
        message="Are you sure you want to delete this sample item? This action deletes the row from Supabase and cannot be undone."
        isDestructive
        confirmText="Confirm Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
