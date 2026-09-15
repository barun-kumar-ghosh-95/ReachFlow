// src/app/page.tsx — Complete Landing Homepage
import Link from 'next/link'
import {
  Zap, MessageSquare, Mail, BarChart2, Clock, Users,
  Shield, CheckCircle, ArrowRight, Sparkles, Globe,
  Target, TrendingUp, Lock, Star, ChevronDown
} from 'lucide-react'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

// ============================================================
// Data
// ============================================================

const features = [
  {
    icon: MessageSquare,
    title: 'WhatsApp Campaigns',
    description: 'Send personalized WhatsApp campaigns at scale using the official Meta Business API. Templates, media, and personalization included.',
    color: '#dcfce7',
    iconColor: '#15803d',
  },
  {
    icon: Mail,
    title: 'Email Campaigns',
    description: 'Design beautiful email campaigns with rich text, HTML, and personalization. Works with Resend, SendGrid, Amazon SES, or SMTP.',
    color: 'var(--brand-50)',
    iconColor: 'var(--brand-600)',
  },
  {
    icon: Clock,
    title: 'Smart Scheduling',
    description: 'Schedule campaigns for any timezone. Your audience receives messages at the perfect time, wherever they are.',
    color: '#fef3c7',
    iconColor: '#d97706',
  },
  {
    icon: Target,
    title: 'Audience Segmentation',
    description: 'Target the right contacts with lists, tags, and custom filters. Always show eligible vs. excluded contact counts.',
    color: '#fce7f3',
    iconColor: '#be185d',
  },
  {
    icon: Sparkles,
    title: 'AI Assistant',
    description: 'Generate, rewrite, shorten, or translate message content with AI. You always review before sending — AI never sends automatically.',
    color: '#ede9fe',
    iconColor: '#7c3aed',
  },
  {
    icon: BarChart2,
    title: 'Real-time Analytics',
    description: 'Track delivery, opens, clicks, read rates, and failures. Aggregated metrics so analytics stay fast at any scale.',
    color: 'var(--info-50)',
    iconColor: 'var(--info-600)',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite teammates with role-based permissions: Owner, Admin, Member, Viewer. Every action is audit-logged.',
    color: '#fff7ed',
    iconColor: '#ea580c',
  },
  {
    icon: Shield,
    title: 'Compliance Built-in',
    description: 'Consent tracking, suppression lists, unsubscribe links, and opt-out handling on every channel. Stay compliant by default.',
    color: 'var(--success-50)',
    iconColor: 'var(--success-700)',
  },
]

const pricingPlans = [
  {
    name: 'FREE',
    price: '0',
    description: 'Perfect for testing ReachFlow and sending your first campaigns.',
    features: [
      '30 messages/month',
      'WhatsApp + Email channels',
      'Up to 100 contacts',
      'Basic analytics',
      'Demo mode — test without credentials',
      '3 templates',
      '1 team member',
    ],
    cta: 'Start for free',
    href: '/register',
    featured: false,
  },
  {
    name: 'STARTER',
    price: '1',
    description: 'For growing businesses ready to run real campaigns.',
    features: [
      '1,000 messages/month',
      'WhatsApp + Email channels',
      'Up to 500 contacts',
      'Advanced analytics',
      'AI message assistant',
      '20 templates',
      '3 team members',
      'CSV import',
      'Priority support',
    ],
    cta: 'Start Starter',
    href: '/register?plan=starter',
    featured: true,
    badge: 'Most Popular',
  },
]

const faqs = [
  {
    question: 'Does ReachFlow use the official WhatsApp Business API?',
    answer: 'Yes. ReachFlow exclusively uses the official Meta WhatsApp Business Cloud API. We do not automate personal accounts, scrape WhatsApp Web, or bypass any platform restrictions.',
  },
  {
    question: 'Can I try ReachFlow without WhatsApp credentials?',
    answer: 'Absolutely. ReachFlow has a Demo Mode that simulates the entire campaign flow — from queuing to delivery status — without requiring any real provider credentials.',
  },
  {
    question: 'How does consent and opt-out work?',
    answer: 'Every contact has explicit consent tracking per channel. Non-consented contacts are automatically excluded from campaigns. Every marketing email includes an unsubscribe link, and opt-outs are honored immediately via suppression lists.',
  },
  {
    question: 'Is multi-tenant isolation enforced?',
    answer: 'Yes. Every resource belongs to a workspace. Tenant isolation is enforced at the service and database level, not just the frontend. Workspace A cannot access any data belonging to Workspace B.',
  },
  {
    question: 'Can I upgrade or cancel anytime?',
    answer: 'Yes. Subscriptions are managed through Stripe and can be upgraded, downgraded, or cancelled at any time. Cancellation takes effect at the end of the current billing period.',
  },
  {
    question: 'What happens when I hit my message quota?',
    answer: 'Campaigns check quota before sending. If your remaining quota would be exceeded, the campaign is blocked and you receive a clear warning. No partial sends that leave you over-quota.',
  },
]

const stats = [
  { value: '10K+', label: 'Messages/day capacity' },
  { value: '99.9%', label: 'API uptime SLA' },
  { value: '<2s', label: 'Avg. send latency' },
  { value: '2', label: 'Channels (WhatsApp + Email)' },
]

// ============================================================
// Page
// ============================================================

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        {/* ================================================
            HERO
            ================================================ */}
        <section className="hero" id="hero">
          <div className="hero-inner">
            {/* Badge */}
            <div className="hero-badge">
              <Zap size={12} />
              Official Meta WhatsApp Business API
            </div>

            {/* Title */}
            <h1 className="hero-title">
              One place to<br />
              <span className="gradient-text">reach your audience</span>
            </h1>

            <p className="hero-subtitle">
              Create, personalize, schedule and analyze WhatsApp and email
              campaigns from one powerful workspace. Built for teams who take
              marketing seriously.
            </p>

            {/* CTAs */}
            <div className="hero-actions">
              <Link href="/register" className="btn btn-primary btn-lg" id="hero-cta-primary">
                Start for free
                <ArrowRight size={18} />
              </Link>
              <Link href="/features" className="btn btn-secondary btn-lg" id="hero-cta-secondary">
                See all features
              </Link>
            </div>

            {/* Social Proof */}
            <div className="hero-social-proof">
              {stats.map((stat, i) => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  {i > 0 && <div className="hero-divider" />}
                  <div className="hero-stat">
                    <span className="hero-stat-value">{stat.value}</span>
                    <span className="hero-stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================
            PRODUCT PREVIEW
            ================================================ */}
        <section style={{ padding: 'var(--space-16) var(--space-8)', background: 'var(--bg-secondary)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{
              background: 'var(--gray-900)',
              borderRadius: 'var(--radius-2xl)',
              padding: '3px',
              boxShadow: 'var(--shadow-2xl), 0 0 60px rgba(90,106,240,0.15)',
            }}>
              {/* Browser chrome */}
              <div style={{ background: 'var(--gray-800)', borderRadius: 'calc(var(--radius-2xl) - 3px) calc(var(--radius-2xl) - 3px) 0 0', padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{ flex: 1, background: 'var(--gray-700)', borderRadius: 'var(--radius-md)', padding: '0.25rem 1rem', fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>
                  app.reachflow.app/dashboard
                </div>
              </div>

              {/* Dashboard Preview */}
              <div style={{ background: 'var(--gray-50)', borderRadius: '0 0 calc(var(--radius-2xl) - 3px) calc(var(--radius-2xl) - 3px)', overflow: 'hidden', display: 'flex', minHeight: '400px' }}>
                {/* Sidebar */}
                <div style={{ width: '200px', background: 'var(--gray-900)', padding: 'var(--space-4)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', padding: '0 var(--space-2)' }}>
                    <div style={{ width: '24px', height: '24px', background: 'var(--gradient-brand)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={14} color="white" />
                    </div>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: 'var(--text-sm)' }}>ReachFlow</span>
                  </div>
                  {['Dashboard', 'Campaigns', 'Contacts', 'Templates', 'Analytics'].map((item, i) => (
                    <div key={item} style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: '2px', fontSize: 'var(--text-xs)', color: i === 0 ? 'white' : 'rgba(255,255,255,0.5)', background: i === 0 ? 'var(--brand-600)' : 'transparent', fontWeight: '500' }}>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: 'var(--space-5)' }}>
                  <div style={{ marginBottom: 'var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Good morning</div>
                      <div style={{ fontSize: 'var(--text-xl)', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Sarah Johnson 👋</div>
                    </div>
                    <div className="btn btn-primary btn-sm">+ New Campaign</div>
                  </div>

                  {/* Stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    {[
                      { label: 'Messages Sent', value: '8,420', change: '+12%', color: 'var(--brand-500)' },
                      { label: 'Delivery Rate', value: '98.2%', change: '+0.4%', color: 'var(--success-500)' },
                      { label: 'Active Campaigns', value: '3', change: '2 scheduled', color: 'var(--warning-500)' },
                      { label: 'Remaining', value: '1,580', change: 'This month', color: 'var(--info-500)' },
                    ].map((stat) => (
                      <div key={stat.label} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>{stat.label}</div>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: '800', color: stat.color, letterSpacing: '-0.03em' }}>{stat.value}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--success-600)', marginTop: '2px' }}>{stat.change}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent campaigns */}
                  <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)', fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Recent Campaigns
                    </div>
                    {[
                      { name: 'Summer Sale Announcement', channel: 'WhatsApp', status: 'Completed', sent: '1,234', rate: '98%', color: '#25d366' },
                      { name: 'Monthly Newsletter', channel: 'Email', status: 'Sending', sent: '892', rate: '96%', color: 'var(--brand-500)' },
                      { name: 'Appointment Reminder', channel: 'WhatsApp', status: 'Scheduled', sent: '—', rate: '—', color: '#25d366' },
                    ].map((campaign) => (
                      <div key={campaign.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-4)', borderBottom: '1px solid var(--border)', fontSize: 'var(--text-xs)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: campaign.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontWeight: '500', color: 'var(--text-primary)' }}>{campaign.name}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{campaign.channel}</span>
                        <span style={{
                          background: campaign.status === 'Completed' ? 'var(--success-50)' : campaign.status === 'Sending' ? 'var(--brand-50)' : 'var(--warning-50)',
                          color: campaign.status === 'Completed' ? 'var(--success-700)' : campaign.status === 'Sending' ? 'var(--brand-700)' : 'var(--warning-600)',
                          padding: '1px 8px', borderRadius: '999px', fontWeight: '600',
                        }}>{campaign.status}</span>
                        <span style={{ color: 'var(--success-600)', fontWeight: '600' }}>{campaign.rate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================
            PROBLEM / SOLUTION
            ================================================ */}
        <section className="section">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', alignItems: 'center' }}>
              <div>
                <div className="section-eyebrow">The Problem</div>
                <h2 style={{ fontSize: 'clamp(1.875rem, 3vw, 2.5rem)', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: 'var(--space-6)', lineHeight: '1.15' }}>
                  Managing campaigns across tools is painful
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {[
                    'Different tools for WhatsApp and email — no unified view',
                    'No built-in consent or opt-out management',
                    'Scheduling is error-prone without timezone support',
                    'No analytics without data exports and spreadsheets',
                    'Team collaboration is impossible without shared workspace',
                  ].map((pain) => (
                    <div key={pain} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--error-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <span style={{ color: 'var(--error-500)', fontSize: '12px', fontWeight: '700' }}>✕</span>
                      </div>
                      {pain}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="section-eyebrow">The Solution</div>
                <h2 style={{ fontSize: 'clamp(1.875rem, 3vw, 2.5rem)', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: 'var(--space-6)', lineHeight: '1.15' }}>
                  ReachFlow unifies everything in one workspace
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {[
                    'One workspace for WhatsApp and email campaigns',
                    'Consent tracking and suppression lists built-in',
                    'Timezone-aware scheduling with cancel/edit support',
                    'Real-time analytics dashboard — no exports needed',
                    'Role-based team access with full audit logs',
                  ].map((solution) => (
                    <div key={solution} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--success-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <span style={{ color: 'var(--success-600)', fontSize: '12px', fontWeight: '700' }}>✓</span>
                      </div>
                      {solution}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================
            FEATURES
            ================================================ */}
        <section className="section section-alt" id="features">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div className="section-header">
              <div className="section-eyebrow">Capabilities</div>
              <h2 className="section-title">Everything you need to run great campaigns</h2>
              <p className="section-description">
                From contact import to campaign analytics — the full campaign lifecycle in one product.
              </p>
            </div>

            <div className="feature-grid">
              {features.map((feature) => (
                <div key={feature.title} className="feature-card">
                  <div className="feature-icon" style={{ background: feature.color, color: feature.iconColor }}>
                    <feature.icon size={24} />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================
            WHATSAPP SECTION
            ================================================ */}
        <section className="section">
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', alignItems: 'center' }}>
            {/* Phone mockup */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="phone-preview animate-float">
                <div className="phone-screen">
                  <div className="phone-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                      🏪
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700' }}>Acme Store</div>
                      <div style={{ fontSize: '9px', opacity: 0.8 }}>Business Account ✓</div>
                    </div>
                  </div>
                  <div className="phone-messages">
                    <div className="phone-message">
                      Hi Sarah! 👋 Your order #RF-2024 is ready for pickup. Store open until 9 PM today.
                      <div className="phone-message-time">10:30 AM ✓✓</div>
                    </div>
                    <div className="phone-message" style={{ marginTop: 'auto' }}>
                      🎉 Special offer just for you! 20% off your next order. Use code SARAH20. Valid until Sunday.
                      <div className="phone-message-time">2:15 PM ✓✓</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', fontSize: 'var(--text-xs)', fontWeight: '700', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <MessageSquare size={12} />
                WhatsApp Business
              </div>
              <h2 style={{ fontSize: 'clamp(1.875rem, 3vw, 2.5rem)', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: 'var(--space-4)', lineHeight: '1.15' }}>
                Official WhatsApp Business API
              </h2>
              <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: '1.7' }}>
                ReachFlow uses the official Meta WhatsApp Business Cloud API exclusively. No unofficial automation, no personal account risks — just compliant, scalable messaging.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  'Send text, images, videos, and documents',
                  'Use pre-approved WhatsApp templates',
                  'Personalize with contact variables',
                  'Track delivery and read receipts',
                  'Consent-first — never message without permission',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    <CheckCircle size={16} color="var(--success-500)" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ================================================
            ANALYTICS SECTION
            ================================================ */}
        <section className="section section-alt">
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', alignItems: 'center' }}>
            <div>
              <div className="section-eyebrow">Analytics</div>
              <h2 style={{ fontSize: 'clamp(1.875rem, 3vw, 2.5rem)', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: 'var(--space-4)', lineHeight: '1.15' }}>
                Know exactly how your campaigns perform
              </h2>
              <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: '1.7' }}>
                Track delivery rates, read receipts, email opens, clicks, and unsubscribes in real time. Aggregated metrics keep analytics fast even at scale.
              </p>
              {[
                { label: 'Messages Delivered', value: '98.2%', color: 'var(--success-500)' },
                { label: 'Average Read Rate (WhatsApp)', value: '94%', color: '#25d366' },
                { label: 'Email Open Rate', value: '28%', color: 'var(--brand-500)' },
              ].map((metric) => (
                <div key={metric.label} style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                    <span>{metric.label}</span>
                    <span style={{ color: metric.color }}>{metric.value}</span>
                  </div>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: metric.value, background: metric.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics card mockup */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)' }}>Campaign Performance</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Last 7 days</div>
                </div>
                <div className="badge badge-success">+12% vs last week</div>
              </div>
              {[
                { day: 'Mon', sent: 85, delivered: 84 },
                { day: 'Tue', sent: 120, delivered: 118 },
                { day: 'Wed', sent: 95, delivered: 93 },
                { day: 'Thu', sent: 180, delivered: 177 },
                { day: 'Fri', sent: 210, delivered: 206 },
                { day: 'Sat', sent: 140, delivered: 138 },
                { day: 'Sun', sent: 90, delivered: 89 },
              ].map((day) => (
                <div key={day.day} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ width: '28px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: '600', flexShrink: 0 }}>{day.day}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(day.delivered / 210) * 100}%`, background: 'var(--gradient-brand)', borderRadius: 'var(--radius-full)' }} />
                    </div>
                  </div>
                  <div style={{ width: '36px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: '600' }}>{day.delivered}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================
            SECURITY SECTION
            ================================================ */}
        <section className="section">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div className="section-header">
              <div className="section-eyebrow">Security & Compliance</div>
              <h2 className="section-title">Built to be trusted</h2>
              <p className="section-description">
                Multi-tenant isolation, consent tracking, audit logs, and compliance tools are not bolt-ons — they are core to how ReachFlow is architected.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-6)' }}>
              {[
                { icon: Lock, title: 'Tenant Isolation', description: 'Your workspace data is completely isolated. No cross-tenant data access is architecturally possible.' },
                { icon: Shield, title: 'Consent Tracking', description: 'Every contact has per-channel opt-in status. Non-consented contacts are automatically excluded from campaigns.' },
                { icon: Globe, title: 'Suppression Lists', description: 'Global and per-workspace suppression lists. Unsubscribes are honored instantly across all future campaigns.' },
                { icon: TrendingUp, title: 'Audit Logs', description: 'Every action — login, campaign, billing change — is logged with user, timestamp, and IP address.' },
                { icon: Star, title: 'Rate Limiting', description: 'API rate limiting per user, per workspace, per action type. Prevents abuse and ensures fair usage.' },
                { icon: CheckCircle, title: 'Webhook Verification', description: 'All provider webhooks are cryptographically verified. Payment status is never trusted from the frontend.' },
              ].map((item) => (
                <div key={item.title} style={{ padding: 'var(--space-6)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', background: 'var(--surface)' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--brand-50)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)', color: 'var(--brand-600)' }}>
                    <item.icon size={20} />
                  </div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '700', marginBottom: 'var(--space-2)', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{item.title}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================
            PRICING
            ================================================ */}
        <section className="section section-alt" id="pricing">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div className="section-header">
              <div className="section-eyebrow">Pricing</div>
              <h2 className="section-title">Simple, transparent pricing</h2>
              <p className="section-description">
                Start free. Upgrade when you need more. Cancel anytime. No hidden fees.
              </p>
            </div>

            <div className="pricing-grid">
              {pricingPlans.map((plan) => (
                <div key={plan.name} className={`pricing-card${plan.featured ? ' featured' : ''}`}>
                  {plan.badge && (
                    <div className="pricing-badge">{plan.badge}</div>
                  )}
                  <div className="pricing-plan">{plan.name}</div>
                  <div className="pricing-price">
                    <span className="pricing-currency">$</span>
                    <span className="pricing-amount">{plan.price}</span>
                    <span className="pricing-period">/month</span>
                  </div>
                  <p className="pricing-description">{plan.description}</p>
                  <ul className="pricing-features">
                    {plan.features.map((feature) => (
                      <li key={feature} className="pricing-feature">
                        <CheckCircle size={16} className="pricing-feature-icon" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href} className={`btn ${plan.featured ? 'btn-primary' : 'btn-secondary'} w-full`} style={{ justifyContent: 'center' }}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <p style={{ textAlign: 'center', marginTop: 'var(--space-8)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
              Need more? <Link href="/contact" style={{ color: 'var(--accent)', fontWeight: '600' }}>Contact us</Link> for Pro, Business, and Enterprise plans.
            </p>
          </div>
        </section>

        {/* ================================================
            FAQ
            ================================================ */}
        <section className="section" id="faq">
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <div className="section-header">
              <div className="section-eyebrow">FAQ</div>
              <h2 className="section-title">Common questions</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {faqs.map((faq) => (
                <details key={faq.question} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', background: 'var(--surface)', overflow: 'hidden' }}>
                  <summary style={{ padding: 'var(--space-5) var(--space-6)', cursor: 'pointer', fontWeight: '600', fontSize: 'var(--text-base)', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', listStyle: 'none', userSelect: 'none' }}>
                    {faq.question}
                    <ChevronDown size={18} color="var(--text-tertiary)" />
                  </summary>
                  <div style={{ padding: '0 var(--space-6) var(--space-5)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: '1.7', borderTop: '1px solid var(--border)' }}>
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================
            FINAL CTA
            ================================================ */}
        <section style={{ padding: 'var(--space-24) var(--space-8)', background: 'linear-gradient(135deg, var(--brand-950) 0%, var(--brand-800) 100%)', textAlign: 'center' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 'var(--text-xs)', fontWeight: '700', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <Zap size={12} />
              Free to start — no credit card required
            </div>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '800', color: 'white', letterSpacing: '-0.04em', lineHeight: '1.1', marginBottom: 'var(--space-4)' }}>
              Start reaching your audience today
            </h2>
            <p style={{ fontSize: 'var(--text-xl)', color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--space-10)', lineHeight: '1.6' }}>
              Set up your workspace, import your contacts, and launch your first campaign in minutes.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <Link href="/register" className="btn btn-lg" id="cta-final-register" style={{ background: 'white', color: 'var(--brand-800)', border: 'none', fontWeight: '700' }}>
                Create free account
                <ArrowRight size={18} />
              </Link>
              <Link href="/contact" className="btn btn-lg btn-ghost" style={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.3)' }}>
                Talk to us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
