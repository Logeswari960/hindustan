import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { Button, FormField, Input, Select, Stepper, Card } from '../components/ui';
import { profileApi } from '../services/api';
import { backendConfigured, hasBackendSession } from '../services/backendClient';

const STEPS = ['Basic info', 'Education', 'Income', 'Location', 'Additional', 'Documents'];

const STEP_DESCRIPTIONS = [
  'Tell us a bit about yourself so we can personalise your results.',
  'Your education details help us find scholarships and academic support programs.',
  'Income information helps identify financial assistance programs you may qualify for.',
  'Your location determines which state and central schemes are available to you.',
  'Additional circumstances can unlock more targeted support programs.',
  'Knowing which documents you have helps us show you what you can apply for right now.',
];

interface FormData {
  firstName: string; lastName: string; age: string; gender: string;
  education: string; institution: string; course: string; institutionType: string; year: string;
  income: string; annualIncome: string; academicPercentage: string; employed: string;
  state: string; district: string;
  category: string; disability: string; dependents: string;
  hasAadhaar: string; hasIncomeCert: string; hasCommunityCert: string;
}

const INITIAL: FormData = {
  firstName: '', lastName: '', age: '', gender: '',
  education: '', institution: '', course: '', institutionType: '', year: '',
  income: '', annualIncome: '', academicPercentage: '', employed: '',
  state: '', district: '',
  category: '', disability: '', dependents: '',
  hasAadhaar: '', hasIncomeCert: '', hasCommunityCert: '',
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (backendConfigured && !hasBackendSession()) return;
    profileApi.get().then(profile => {
      if (!profile) return;
      setForm({
        ...INITIAL,
        firstName: profile.firstName,
        lastName: profile.lastName,
        age: profile.age ? String(profile.age) : '',
        gender: profile.gender,
        education: profile.education,
        institution: profile.institution,
        course: profile.course ?? '',
        institutionType: profile.institutionType ?? '',
        year: profile.courseYear ?? '',
        income: profile.income,
        annualIncome: profile.annualIncome ? String(profile.annualIncome) : '',
        academicPercentage: profile.academicPercentage ? String(profile.academicPercentage) : '',
        employed: profile.employmentStatus,
        state: profile.state,
        district: profile.district,
        category: profile.category,
        disability: profile.hasDisability ? 'Yes — with disability certificate' : '',
      });
      setConsent(Boolean(profile.privacyConsent));
    }).catch(() => setError('Could not load your saved profile.'));
  }, []);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const next = () => {
    const requiredByStep: Record<number, (keyof FormData)[]> = {
      0: ['firstName', 'lastName', 'age'],
      1: ['education'],
      2: ['income'],
      3: ['state'],
    };
    const missing = (requiredByStep[step] ?? []).some(key => !form[key].trim());
    if (missing) {
      setError('Complete the required fields before continuing.');
      return;
    }
    if (step === 0 && (!Number.isInteger(Number(form.age)) || Number(form.age) < 5 || Number(form.age) > 100)) {
      setError('Enter an age between 5 and 100.');
      return;
    }
    setError('');
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    if (!consent) {
      setError('Please confirm the privacy notice before saving your profile.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await profileApi.update({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        age: Number(form.age),
        gender: form.gender,
        education: form.education,
        institution: form.institution.trim(),
        course: form.course.trim(),
        courseYear: form.year,
        institutionType: form.institutionType,
        income: form.income,
        annualIncome: form.annualIncome ? Number(form.annualIncome) : undefined,
        academicPercentage: form.academicPercentage ? Number(form.academicPercentage) : undefined,
        employmentStatus: form.employed,
        state: form.state,
        district: form.district.trim(),
        location: [form.district.trim(), form.state].filter(Boolean).join(', '),
        category: form.category,
        hasDisability: form.disability.startsWith('Yes'),
        privacyConsent: consent,
      });
      navigate('/dashboard');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepContent = [
    // 0 — Basic info
    <div key="0" className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="First name" required htmlFor="firstName">
          <Input id="firstName" value={form.firstName} onChange={set('firstName')} placeholder="First name" autoFocus />
        </FormField>
        <FormField label="Last name" required htmlFor="lastName">
          <Input id="lastName" value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
        </FormField>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Age" required hint="Your age determines eligibility for age-restricted programs." htmlFor="age">
          <Input id="age" type="number" value={form.age} onChange={set('age')} placeholder="Age" min="5" max="100" />
        </FormField>
        <FormField label="Gender" htmlFor="gender">
          <Select id="gender" value={form.gender} onChange={set('gender')}>
            <option value="">Select</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary / Other</option>
            <option>Prefer not to say</option>
          </Select>
        </FormField>
      </div>
    </div>,

    // 1 — Education
    <div key="1" className="space-y-4">
      <FormField label="Highest education level" required htmlFor="education">
        <Select id="education" value={form.education} onChange={set('education')}>
          <option value="">Select</option>
          <option>Secondary (Class X)</option>
          <option>Higher Secondary (Class XII)</option>
          <option>Undergraduate (pursuing)</option>
          <option>Undergraduate (completed)</option>
          <option>Postgraduate (pursuing)</option>
          <option>Postgraduate (completed)</option>
          <option>Diploma / ITI</option>
          <option>Other</option>
        </Select>
      </FormField>
      <FormField label="Institution name" hint="Name of your current or most recent institution." htmlFor="institution">
        <Input id="institution" value={form.institution} onChange={set('institution')} placeholder="e.g. University of Mumbai" />
      </FormField>
      <FormField label="Course or programme" hint="Optional — used when a scheme limits eligible courses." htmlFor="course">
        <Input id="course" value={form.course} onChange={set('course')} placeholder="e.g. B.Sc. Computer Science" />
      </FormField>
      <FormField label="Institution type" hint="Optional — select only if known." htmlFor="institutionType">
        <Select id="institutionType" value={form.institutionType} onChange={set('institutionType')}>
          <option value="">Not provided</option>
          <option>Government</option>
          <option>Government-aided</option>
          <option>Private</option>
          <option>Other</option>
        </Select>
      </FormField>
      <FormField label="Current year / semester" hint="If currently enrolled." htmlFor="year">
        <Select id="year" value={form.year} onChange={set('year')}>
          <option value="">Select</option>
          <option>Year 1 / Semester 1–2</option>
          <option>Year 2 / Semester 3–4</option>
          <option>Year 3 / Semester 5–6</option>
          <option>Year 4 / Semester 7–8</option>
          <option>Not currently enrolled</option>
        </Select>
      </FormField>
    </div>,

    // 2 — Income
    <div key="2" className="space-y-4">
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
        <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Your income information is used only to match you with relevant programs. It is never shared with third parties.
        </p>
      </div>
      <FormField label="Annual household income" required hint="Combined income of all earning members in your household." htmlFor="income">
        <Select id="income" value={form.income} onChange={set('income')}>
          <option value="">Select range</option>
          <option>Below ₹1 lakh</option>
          <option>₹1 – 2.5 lakh</option>
          <option>₹2.5 – 4.5 lakh</option>
          <option>₹4.5 – 8 lakh</option>
          <option>Above ₹8 lakh</option>
        </Select>
      </FormField>
      <FormField label="Exact annual family income (₹)" hint="Optional. Enter this only if you know the verified annual amount; it is used for numeric scheme limits." htmlFor="annualIncome">
        <Input id="annualIncome" type="number" min="0" max="100000000" value={form.annualIncome} onChange={set('annualIncome')} />
      </FormField>
      <FormField label="Most recent academic marks (%)" hint="Optional — enter a percentage only when it applies to your course." htmlFor="academicPercentage">
        <Input id="academicPercentage" type="number" min="0" max="100" step="0.01" value={form.academicPercentage} onChange={set('academicPercentage')} />
      </FormField>
      <FormField label="Employment status" htmlFor="employed">
        <Select id="employed" value={form.employed} onChange={set('employed')}>
          <option value="">Select</option>
          <option>Student (not employed)</option>
          <option>Part-time employed</option>
          <option>Full-time employed</option>
          <option>Self-employed</option>
          <option>Unemployed</option>
        </Select>
      </FormField>
    </div>,

    // 3 — Location
    <div key="3" className="space-y-4">
      <FormField label="State" required hint="Your state determines which state-level schemes are available." htmlFor="state">
        <Select id="state" value={form.state} onChange={set('state')}>
          <option value="">Select state</option>
          {['Andhra Pradesh','Assam','Bihar','Delhi','Gujarat','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="District" hint="Optional — helps with district-specific programs." htmlFor="district">
        <Input id="district" value={form.district} onChange={set('district')} placeholder="e.g. Pune" />
      </FormField>
    </div>,

    // 4 — Additional
    <div key="4" className="space-y-4">
      <FormField label="Community category" hint="Used to identify reservation-based and community-specific schemes." htmlFor="category">
        <Select id="category" value={form.category} onChange={set('category')}>
          <option value="">Select</option>
          <option>General</option>
          <option>OBC (Other Backward Class)</option>
          <option>SC (Scheduled Caste)</option>
          <option>ST (Scheduled Tribe)</option>
          <option>EWS (Economically Weaker Section)</option>
          <option>Prefer not to say</option>
        </Select>
      </FormField>
      <FormField label="Do you have a disability?" hint="Helps identify disability-specific support programs." htmlFor="disability">
        <Select id="disability" value={form.disability} onChange={set('disability')}>
          <option value="">Select</option>
          <option>No</option>
          <option>Yes — with disability certificate</option>
          <option>Yes — without certificate yet</option>
        </Select>
      </FormField>
      <FormField label="Number of dependents in household" htmlFor="dependents">
        <Select id="dependents" value={form.dependents} onChange={set('dependents')}>
          <option value="">Select</option>
          <option>0</option>
          <option>1–2</option>
          <option>3–4</option>
          <option>5 or more</option>
        </Select>
      </FormField>
    </div>,

    // 5 — Documents
    <div key="5" className="space-y-4">
      <p className="text-sm text-neutral-500 leading-relaxed">
        Tell us which documents you currently have. This helps us show you benefits you can apply for right now, without waiting to gather everything.
      </p>
      {([
        { key: 'hasAadhaar' as const,      label: 'Aadhaar card',                    hint: 'Required for most central government schemes.' },
        { key: 'hasIncomeCert' as const,   label: 'Income certificate',              hint: 'Issued by a competent authority (Tehsildar or above).' },
        { key: 'hasCommunityCert' as const,label: 'Community / caste certificate',   hint: 'Required for OBC, SC, ST category schemes.' },
      ]).map(({ key, label, hint }) => (
        <FormField key={key} label={label} hint={hint} htmlFor={key}>
          <Select id={key} value={form[key]} onChange={set(key)}>
            <option value="">Select</option>
            <option value="yes">Yes, I have it</option>
            <option value="no">No, I don't have it</option>
            <option value="unsure">Not sure</option>
          </Select>
        </FormField>
      ))}
      <label className="flex items-start gap-2 text-sm text-neutral-600 leading-relaxed">
        <input
          type="checkbox"
          checked={consent}
          onChange={event => setConsent(event.target.checked)}
          className="mt-1 accent-navy-700"
        />
        <span>{backendConfigured
          ? 'I agree to save this profile to my authenticated BenefitBridge account.'
          : 'I agree to save this profile in this browser for this demo. This is not a secure account or encrypted storage.'}</span>
      </label>
    </div>,
  ];

  if (backendConfigured && !hasBackendSession()) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg p-6 text-center">
          <h1 className="text-xl font-bold text-neutral-900">Sign in to save your profile</h1>
          <p className="mt-2 text-sm text-neutral-600">Create an account or sign in first. Your profile will then be saved to your account.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/login"><Button variant="secondary">Sign in</Button></Link>
            <Link to="/register"><Button>Create account</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-25 flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Create your profile</h1>
          <p className="text-neutral-500 text-sm">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>

        <div className="mb-8">
          <Stepper steps={STEPS} current={step} />
        </div>

        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">{STEPS[step]}</h2>
            <p className="text-sm text-neutral-500 mt-1 leading-relaxed">{STEP_DESCRIPTIONS[step]}</p>
          </div>

          <div className="animate-fade-in">{stepContent[step]}</div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-100">
            <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={back} disabled={step === 0}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button icon={<ArrowRight size={16} />} iconPosition="right" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button loading={submitting} onClick={submit}>
                {submitting ? 'Finding your benefits...' : 'Find my benefits'}
              </Button>
            )}
          </div>
        </Card>

        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

        {!backendConfigured && (
          <p className="text-center text-xs text-neutral-400 mt-6 leading-relaxed">
            Demo mode stores profile details in this browser only. Do not enter information you would not store locally on this device.
          </p>
        )}
      </div>
    </div>
  );
}
