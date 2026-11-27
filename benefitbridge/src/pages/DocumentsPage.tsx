import { useEffect, useRef, useState } from 'react';
import { Upload, FileText, ShieldAlert } from 'lucide-react';
import { benefitsApi, documentsApi } from '../services/api';
import { backendConfigured } from '../services/backendClient';
import type { Benefit, Document, DocumentStatus } from '../types';
import { Button, EmptyState, Skeleton, Toast } from '../components/ui';
import { DocumentCard } from '../components/ui/domain';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const requestedDocument = useRef('');
  const replacingDocumentId = useRef<string | null>(null);

  const refresh = async () => {
    const [savedDocuments, catalog] = await Promise.all([documentsApi.getAll(), benefitsApi.getAll()]);
    setDocs(savedDocuments);
    setBenefits(catalog);
  };

  useEffect(() => {
    refresh()
      .catch(() => setToast('Could not load document information.'))
      .finally(() => setLoading(false));
  }, []);

  const requestUpload = (documentName: string, replaceId: string | null = null) => {
    requestedDocument.current = documentName;
    replacingDocumentId.current = replaceId;
    fileInput.current?.click();
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setToast('Choose a PDF, JPG, or PNG file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setToast('Files must be 10 MB or smaller.');
      return;
    }
    try {
      if (replacingDocumentId.current) {
        await documentsApi.replace(replacingDocumentId.current, file, requestedDocument.current);
      } else {
        await documentsApi.upload(file, requestedDocument.current);
      }
      await refresh();
      setToast(replacingDocumentId.current ? 'Document replaced and marked for review.' : 'Document uploaded and marked for review.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not upload this document.');
    } finally {
      replacingDocumentId.current = null;
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this document from the demo record?')) return;
    try {
      await documentsApi.delete(id);
      await refresh();
      setToast('Document removed.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not remove this document.');
    }
  };

  const download = async (doc: Document) => {
    try {
      const blob = await documentsApi.download(doc.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = doc.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not download this document.');
    }
  };

  const requirements = benefits.flatMap(benefit => benefit.requiredDocuments.map(document => {
    const normalizeType = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const status: DocumentStatus = docs.some(uploaded => normalizeType(uploaded.type) === normalizeType(document.name))
      ? 'needs_review'
      : 'missing';
    return {
      benefitId: benefit.id,
      benefitName: benefit.name,
      name: document.name,
      status,
      description: document.description,
    };
  }));
  const uniqueRequirements = [...new Map(requirements.map(item => [item.name.toLowerCase(), item])).values()];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Documents</h1>
          <p className="text-neutral-500 text-sm mt-1">Review the document checklists for the catalogue benefits.</p>
        </div>
        <Button icon={<Upload size={15} />} onClick={() => requestUpload('General document')}>Upload document</Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={upload}
        aria-label="Select document to upload"
      />

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          {backendConfigured
            ? 'Files are restricted to PDF/JPG/PNG up to 10 MB. Uploaded files are private to your authenticated account and marked as needing review; BenefitBridge does not officially verify them.'
            : 'Demo uploads are restricted to PDF/JPG/PNG up to 10 MB and are stored locally in this browser for presentation only.'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-neutral-700 mb-3">Required documents by benefit</h2>
            {uniqueRequirements.length === 0 ? (
              <EmptyState icon={<FileText size={22} />} title="No document checklist" description="Required documents will appear here when benefit records are available." />
            ) : (
              <div className="space-y-2">
                {uniqueRequirements.map((document, index) => (
                  <DocumentCard
                    key={`${document.name}-${index}`}
                    doc={{
                      id: `${document.benefitId}-${document.name}`,
                      name: document.name,
                      type: 'Required',
                      uploadedDate: '',
                      status: document.status,
                      usedIn: requirements.filter(item => item.name.toLowerCase() === document.name.toLowerCase()).map(item => item.benefitName),
                    }}
                    onUpload={() => requestUpload(document.name)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-neutral-700 mb-3">Uploaded documents ({docs.length})</h2>
            {docs.length === 0 ? (
              <p className="text-sm text-neutral-500">No files have been uploaded to this demo.</p>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onUpload={() => requestUpload(doc.type, doc.id)}
                    onDelete={() => remove(doc.id)}
                    onDownload={() => download(doc)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} />}
    </div>
  );
}
