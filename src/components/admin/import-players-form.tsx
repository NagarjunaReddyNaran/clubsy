"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileText, CheckCircle2, XCircle } from "lucide-react";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  tempPasswords?: Array<{ email: string; tempPassword: string }>;
}

export function ImportPlayersForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) {
      setError("Only CSV files are supported");
      return;
    }
    setFile(f);
    setError("");
    setResult(null);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/import/players", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
      } else {
        setResult(data);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Template download */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Step 1: Download Template</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            Download the CSV template and fill in your player data.
          </p>
          <a href="/api/admin/import/template">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </a>
          <div className="mt-3 text-xs text-gray-500 space-y-0.5">
            <p><strong>Required columns:</strong> name, email</p>
            <p><strong>Optional columns:</strong> phone, plan_name, start_date, expiry_date, payment_status</p>
            <p><strong>Dates format:</strong> YYYY-MM-DD (e.g. 2025-01-15)</p>
            <p><strong>Payment status values:</strong> paid / unpaid</p>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Step 2: Upload CSV</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{file.name}</span>
                <Badge variant="info">{(file.size / 1024).toFixed(1)} KB</Badge>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Click to upload CSV</p>
                <p className="text-xs text-gray-400 mt-1">Only .csv files supported</p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
          />

          <Button
            onClick={handleImport}
            loading={loading}
            disabled={!file}
            className="w-full"
          >
            <Upload className="w-4 h-4" />
            Import Players
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Import Results</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-lg font-bold text-green-700">{result.imported}</p>
                  <p className="text-xs text-green-600">Imported</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                <XCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-lg font-bold text-yellow-700">{result.skipped}</p>
                  <p className="text-xs text-yellow-600">Skipped</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Issues:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.tempPasswords && result.tempPasswords.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Temporary Passwords — share these with each player:
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Temp Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.tempPasswords.map(({ email, tempPassword }) => (
                        <tr key={email}>
                          <td className="px-3 py-2 text-gray-700">{email}</td>
                          <td className="px-3 py-2 font-mono text-gray-900">{tempPassword}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
