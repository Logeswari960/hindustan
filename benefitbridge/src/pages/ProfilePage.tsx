import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Button, ProgressBar, Toast, Input, Select, FormField } from '../components/ui';
import { profileApi, profileFieldsApi } from '../services/api';
import { backendConfigured } from '../services/backendClient';
import type { ProfileField, UserProfile } from '../types';

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([profileApi.get(), profileFieldsApi.get()])
      .then(([savedProfile, savedFields]) => {
        setProfile(savedProfile);
        setFields(savedFields);
      })
      .catch(() => setToast('Could not load profile data.'));
  }, []);

  const updateField = (key: keyof UserProfile, value: string) => {
    const numeric = ['age', 'annualIncome', 'academicPercentage'].includes(key);
    setProfile(current => current ? {
      ...current,
      [key]: numeric ? (value === '' && key !== 'age' ? undefined : Number(value)) : value,
    } : current);
  };

  const save = async () => {
    if (!profile) return;
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setToast('First and last name are required.');
      return;
    }
    if (!Number.isInteger(profile.age) || profile.age < 5 || profile.age > 120) {
      setToast('Enter an age between 5 and 120.');
      return;
    }
    setSaving(true);
    try {
      const saved = await profileApi.update({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        age: profile.age,
        gender: profile.gender,
        state: profile.state.trim(),
        district: profile.district.trim(),
        location: [profile.district.trim(), profile.state.trim()].filter(Boolean).join(', '),
        education: profile.education,
        institution: profile.institution.trim(),
        course: profile.course?.trim(),
        courseYear: profile.courseYear,
        institutionType: profile.institutionType,
        annualIncome: profile.annualIncome,
        academicPercentage: profile.academicPercentage,
        income: profile.income,
        employmentStatus: profile.employmentStatus,
        category: profile.category,
        hasDisability: profile.hasDisability,
        privacyConsent: profile.privacyConsent ?? true,
      });
      setProfile(saved);
      setFields(await profileFieldsApi.get());
      setEditing(false);
      setToast(backendConfigured ? 'Profile saved to your account.' : 'Profile saved in this browser.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-5 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
          <p className="text-neutral-500 text-sm mt-1">{backendConfigured ? 'No profile has been saved to this account.' : 'No profile has been saved in this browser.'}</p>
        </div>
        <Card className="p-5">
          <p className="text-sm text-neutral-600 mb-4">
            {backendConfigured
              ? 'Add profile details to assess verified scheme rules. Sensitive information is optional unless a scheme requires it.'
              : 'Create a profile to see preliminary matches. In demo mode, information stays in this browser and is not protected by an account.'}
          </p>
          <Button onClick={() => navigate('/onboarding')}>Create profile</Button>
        </Card>
        {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} />}
      </div>
    );
  }

  const infoRows = [
    { label: 'Full name', value: `${profile.firstName} ${profile.lastName}`.trim() },
    { label: 'Age', value: profile.age ? String(profile.age) : '' },
    { label: 'Gender', value: profile.gender },
    { label: 'Location', value: profile.location },
    { label: 'Education', value: profile.education },
    { label: 'Institution', value: profile.institution },
    { label: 'Course / programme', value: profile.course ?? '' },
    { label: 'Course year', value: profile.courseYear ?? '' },
    { label: 'Institution type', value: profile.institutionType ?? '' },
    { label: 'Annual family income (₹)', value: profile.annualIncome == null ? '' : String(profile.annualIncome) },
    { label: 'Academic marks (%)', value: profile.academicPercentage == null ? '' : String(profile.academicPercentage) },
    { label: 'Household income', value: profile.income },
    { label: 'Employment status', value: profile.employmentStatus },
    { label: 'Community category', value: profile.category },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
          <p className="text-neutral-500 text-sm mt-1">Update the information used for preliminary benefit matching.</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={save}>Save</Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={() => setEditing(true)}>Edit profile</Button>
        )}
      </div>

      {!backendConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo mode: profile data is stored in this browser only. There is no login, server-side access control, or encrypted storage yet.
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-neutral-800">Profile completeness</h2>
          <span className="text-sm font-bold text-navy-700">{profile.completionPercent}%</span>
        </div>
        <ProgressBar value={profile.completionPercent} className="mb-3" />
        <p className="text-xs text-neutral-500">A more complete profile can help with matching. Sensitive information is optional.</p>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-neutral-800 mb-4">Personal information</h2>
        {editing ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="First name" htmlFor="profile-first-name"><Input id="profile-first-name" value={profile.firstName} onChange={event => updateField('firstName', event.target.value)} /></FormField>
            <FormField label="Last name" htmlFor="profile-last-name"><Input id="profile-last-name" value={profile.lastName} onChange={event => updateField('lastName', event.target.value)} /></FormField>
            <FormField label="Age" htmlFor="profile-age"><Input id="profile-age" type="number" min="5" max="120" value={profile.age || ''} onChange={event => updateField('age', event.target.value)} /></FormField>
            <FormField label="State" htmlFor="profile-state"><Input id="profile-state" value={profile.state} onChange={event => updateField('state', event.target.value)} /></FormField>
            <FormField label="District" htmlFor="profile-district"><Input id="profile-district" value={profile.district} onChange={event => updateField('district', event.target.value)} /></FormField>
            <FormField label="Education" htmlFor="profile-education"><Input id="profile-education" value={profile.education} onChange={event => updateField('education', event.target.value)} /></FormField>
            <FormField label="Institution" htmlFor="profile-institution"><Input id="profile-institution" value={profile.institution} onChange={event => updateField('institution', event.target.value)} /></FormField>
            <FormField label="Course / programme" htmlFor="profile-course"><Input id="profile-course" value={profile.course ?? ''} onChange={event => updateField('course', event.target.value)} /></FormField>
            <FormField label="Course year" htmlFor="profile-course-year"><Input id="profile-course-year" value={profile.courseYear ?? ''} onChange={event => updateField('courseYear', event.target.value)} /></FormField>
            <FormField label="Institution type" htmlFor="profile-institution-type"><Input id="profile-institution-type" value={profile.institutionType ?? ''} onChange={event => updateField('institutionType', event.target.value)} /></FormField>
            <FormField label="Annual household income range" htmlFor="profile-income"><Input id="profile-income" value={profile.income} onChange={event => updateField('income', event.target.value)} /></FormField>
            <FormField label="Exact annual family income (₹)" htmlFor="profile-annual-income"><Input id="profile-annual-income" type="number" min="0" max="100000000" value={profile.annualIncome ?? ''} onChange={event => updateField('annualIncome', event.target.value)} /></FormField>
            <FormField label="Academic marks (%)" htmlFor="profile-academic-percentage"><Input id="profile-academic-percentage" type="number" min="0" max="100" step="0.01" value={profile.academicPercentage ?? ''} onChange={event => updateField('academicPercentage', event.target.value)} /></FormField>
            <FormField label="Employment status" htmlFor="profile-employment"><Input id="profile-employment" value={profile.employmentStatus} onChange={event => updateField('employmentStatus', event.target.value)} /></FormField>
            <FormField label="Community category (optional)" htmlFor="profile-category"><Select id="profile-category" value={profile.category} onChange={event => updateField('category', event.target.value)}><option value="">Prefer not to say</option><option>General</option><option>OBC (Other Backward Class)</option><option>SC (Scheduled Caste)</option><option>ST (Scheduled Tribe)</option><option>EWS (Economically Weaker Section)</option></Select></FormField>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            {infoRows.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-neutral-800">{value || 'Not provided'}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-neutral-800 mb-1">Profile details</h2>
        <p className="text-xs text-neutral-500 mb-4">These fields are optional and help you see what information is missing.</p>
        <div className="space-y-3">
          {fields.map(field => (
            <div key={field.key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {field.status === 'complete'
                  ? <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  : <AlertCircle size={14} className="text-amber-500 shrink-0" />}
                <span className="text-sm text-neutral-700 truncate">{field.label}</span>
              </div>
              <span className={`text-xs font-medium shrink-0 ${field.status === 'complete' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {field.status === 'complete' ? 'Provided' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} />}
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const removeData = async () => {
    const message = backendConfigured
      ? 'Permanently delete your account and its profile, documents, applications, and notifications?'
      : 'Delete all BenefitBridge demo data saved in this browser? This cannot be undone.';
    if (!window.confirm(message)) return;
    await profileApi.delete();
    navigate('/');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 text-sm mt-1">Manage data saved locally for this demo.</p>
      </div>
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-neutral-800 mb-2">Privacy & data</h2>
        <p className="text-sm text-neutral-600 mb-4">
          {backendConfigured
            ? 'Account deletion removes server-side profile, document, application, and notification records.'
            : 'This demo has no user accounts or server-side storage. Deleting demo data removes BenefitBridge records from this browser.'}
        </p>
        <Button variant="danger" onClick={removeData}>{backendConfigured ? 'Delete my account' : 'Delete my local demo data'}</Button>
      </Card>
    </div>
  );
}
