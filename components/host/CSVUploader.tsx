'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { CSVRow, Project } from '@/lib/types';
import { shuffle } from '@/lib/utils';

interface CSVUploaderProps {
  onCSVUploaded: (projects: Project[]) => void;
}

export default function CSVUploader({ onCSVUploaded }: CSVUploaderProps) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const projects: Project[] = results.data.map((row, index) => ({
            id: `project-${index}`,
            submissionId: row["Submission ID"] || '',
            submittedAt: row["Submitted At"] || '',
            url: row["Your project link"] || '',
            description: row["What does your project do? (In short)"] || '',
            stage: row["At what stage your product is?"] || '',
            launched: row["Have you launched on forg.to?"] || '',
            struggling: row["One thing you're struggling with"] || '',
            credentials: row["Dummy credentials"] || '',
          }));

          const shuffledProjects = shuffle(projects);
          onCSVUploaded(shuffledProjects);
        } catch (err) {
          setError('Failed to parse CSV. Please check the format.');
          console.error(err);
        }
      },
      error: (err) => {
        setError('Failed to read CSV file.');
        console.error(err);
      },
    });
  };

  return (
    <div className="neo-card bg-[#4CAF50] max-w-2xl mx-auto">
      <h2 className="text-4xl font-black uppercase mb-6 text-center">
        Upload Projects
      </h2>

      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          className="neo-button bg-[#FFEB3B] hover:bg-[#FFEB3B] w-full"
        >
          {fileName ? 'Change File' : 'Select CSV File'}
        </Button>

        {fileName && (
          <div className="border-4 border-black bg-white p-4 text-center">
            <p className="font-black text-lg">Selected: {fileName}</p>
          </div>
        )}

        {error && (
          <div className="border-4 border-black bg-[#F44336] text-white p-4 font-black text-center">
            {error}
          </div>
        )}

        <div className="border-4 border-black bg-white p-4">
          <p className="font-bold text-sm mb-2">Required CSV Columns:</p>
          <ul className="text-sm space-y-1 font-bold">
            <li>• Submission ID</li>
            <li>• Submitted At</li>
            <li>• Your project link</li>
            <li>• What does your project do? (In short)</li>
            <li>• At what stage your product is?</li>
            <li>• Have you launched on forg.to?</li>
            <li>• One thing you're struggling with</li>
            <li>• Dummy credentials</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
