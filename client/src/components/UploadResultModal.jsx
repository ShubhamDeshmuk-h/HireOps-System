import React, { useState } from 'react';
import axios from 'axios';
import { FaTimes, FaUpload, FaFileAlt } from 'react-icons/fa';

export default function UploadResultModal({ round, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.json')) {
      setError('Please upload a CSV or JSON file');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Preview file contents
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (selectedFile.name.endsWith('.json')) {
            const data = JSON.parse(e.target.result);
            setPreview(data.slice(0, 5)); // Show first 5 entries
          } else {
            // For CSV, split by newlines and commas
            const lines = e.target.result.split('\\n');
            const headers = lines[0].split(',');
            const preview = lines.slice(1, 6).map(line => {
              const values = line.split(',');
              return headers.reduce((obj, header, i) => {
                obj[header.trim()] = values[i]?.trim();
                return obj;
              }, {});
            });
            setPreview(preview);
          }
        } catch (err) {
          setError('Invalid file format');
        }
      };
      reader.readAsText(selectedFile);
    } catch (err) {
      setError('Failed to read file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('resultFile', file);

      const response = await axios.post(
        `http://localhost:5000/api/rounds/${round._id}/upload-result`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      onSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Upload Results - {round.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* File Upload Section */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
              id="result-file"
            />
            <label
              htmlFor="result-file"
              className="cursor-pointer flex flex-col items-center"
            >
              {file ? (
                <>
                  <FaFileAlt className="w-12 h-12 text-blue-500 mb-3" />
                  <p className="text-gray-700">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Click to change file
                  </p>
                </>
              ) : (
                <>
                  <FaUpload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-700">
                    Drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Supports CSV and JSON formats
                  </p>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Preview Section */}
        {preview && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Preview (First 5 Entries)
            </h3>
            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0] || {}).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((value, j) => (
                        <td
                          key={j}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400"
          >
            {loading ? 'Uploading...' : 'Upload Results'}
          </button>
        </div>
      </div>
    </div>
  );
} 