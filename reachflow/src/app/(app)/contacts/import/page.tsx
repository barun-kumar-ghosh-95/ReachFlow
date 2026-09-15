// src/app/(app)/contacts/import/page.tsx
'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, Upload, AlertCircle, CheckCircle, FileText, Download } from 'lucide-react'

interface ParsedContact {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  whatsappOptIn: boolean
  emailOptIn: boolean
}

export default function ImportContactsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedContact[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function parseCSV(text: string): ParsedContact[] {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''))
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })
      return {
        firstName: row.firstname || row.first_name || row.name || '',
        lastName: row.lastname || row.last_name || '',
        email: row.email || '',
        phone: row.phone || row.mobile || row.whatsapp || '',
        whatsappOptIn: row.whatsapp_opt_in === 'true' || row.whatsaptin === '1',
        emailOptIn: row.email_opt_in === 'true' || row.emailoptin === '1',
      }
    }).filter(c => c.email || c.phone)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setDone(false)
    setImported(0)
    setErrors([])
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const contacts = parseCSV(text)
      setParsed(contacts)
    }
    reader.readAsText(f)
  }

  async function handleImport() {
    setImporting(true)
    setErrors([])
    let successCount = 0
    const errs: string[] = []

    for (const contact of parsed) {
      try {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
        })
        const data = await res.json()
        if (res.ok) {
          successCount++
          setImported(successCount)
        } else {
          errs.push(`${contact.email || contact.phone}: ${data.error}`)
        }
      } catch {
        errs.push(`${contact.email || contact.phone}: Network error`)
      }
    }

    setErrors(errs)
    setDone(true)
    setImporting(false)
  }

  const sampleCSV = `first_name,last_name,email,phone,whatsapp_opt_in,email_opt_in
Sarah,Johnson,sarah@example.com,+919876543210,true,true
John,Doe,john@example.com,+14155552671,false,true
Priya,Sharma,priya@company.com,+919988776655,true,false`

  function downloadSample() {
    const blob = new Blob([sampleCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sample_contacts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <Link href="/contacts" className="btn btn-ghost btn-icon">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="page-title">Import Contacts</h1>
        </div>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: '680px' }}>
          {/* Sample download */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-header">
              <div>
                <div className="card-title">CSV Format</div>
                <div className="card-description">
                  Download our template CSV to see the required format. Supported columns: first_name, last_name, email, phone, whatsapp_opt_in, email_opt_in
                </div>
              </div>
              <button onClick={downloadSample} className="btn btn-secondary btn-sm">
                <Download size={14} /> Sample CSV
              </button>
            </div>
          </div>

          {/* Upload area */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? 'var(--success-400)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-10)',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'var(--success-50)' : 'var(--bg-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {file ? (
                <>
                  <FileText size={40} color="var(--success-500)" style={{ margin: '0 auto var(--space-3)' }} />
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{file.name}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--success-600)' }}>{parsed.length} contacts found</div>
                </>
              ) : (
                <>
                  <Upload size={40} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Click to upload CSV file</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>or drag and drop — max 10MB</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* Preview */}
          {parsed.length > 0 && !done && (
            <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card-title">Preview — {parsed.length} contacts</div>
              </div>
              <div className="table-wrapper" style={{ maxHeight: '260px', overflow: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>WA</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 10).map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 'var(--text-sm)' }}>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</td>
                        <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                        <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                        <td><span className={`badge badge-${c.whatsappOptIn ? 'success' : 'gray'}`}>{c.whatsappOptIn ? 'Yes' : 'No'}</span></td>
                        <td><span className={`badge badge-${c.emailOptIn ? 'success' : 'gray'}`}>{c.emailOptIn ? 'Yes' : 'No'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.length > 10 && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
                  …and {parsed.length - 10} more contacts
                </p>
              )}

              <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button onClick={() => { setFile(null); setParsed([]) }} className="btn btn-secondary">
                  Clear
                </button>
                <button onClick={handleImport} disabled={importing} className="btn btn-primary" id="import-submit">
                  {importing ? `Importing… (${imported}/${parsed.length})` : `Import ${parsed.length} Contacts`}
                </button>
              </div>
            </div>
          )}

          {/* Importing progress */}
          {importing && (
            <div className="card">
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                  <span>Importing contacts…</span>
                  <span style={{ fontWeight: '700' }}>{imported} / {parsed.length}</span>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${(imported / parsed.length) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Done state */}
          {done && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
              background: 'var(--success-50)', border: '1px solid var(--success-100)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
            }}>
              <CheckCircle size={20} color="var(--success-500)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '700', color: 'var(--success-700)', marginBottom: '4px' }}>
                  Import complete! {imported} of {parsed.length} contacts imported.
                </div>
                {errors.length > 0 && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--error-600)', marginTop: 'var(--space-2)' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{errors.length} failed:</div>
                    {errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
                <Link href="/contacts" className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-3)', display: 'inline-flex' }}>
                  View Contacts
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
