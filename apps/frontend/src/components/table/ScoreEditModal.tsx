import React, { useState } from 'react';
import type { TableRowData } from '../../types/student';

interface ScoreEditModalProps {
  student: TableRowData;
  cohortId: string;
  weekId: string;
  onSubmit: (studentData: TableRowData) => void;
  onClose: () => void;
}

export const ScoreEditModal: React.FC<ScoreEditModalProps> = ({
  student,
  cohortId,
  weekId,
  onSubmit,
  onClose,
}) => {
  const [editedStudent, setEditedStudent] = useState<TableRowData>({ ...student });

  const scoreOptions = [0, 1, 2, 3, 4, 5];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setEditedStudent(prev => {
      if (name.startsWith('gdScore.')) {
        const key = name.split('.')[1] as keyof TableRowData['gdScore'];
        return {
          ...prev,
          gdScore: { ...prev.gdScore, [key]: parseInt(value) || 0 },
        };
      }
      if (name.startsWith('bonusScore.')) {
        const key = name.split('.')[1] as keyof TableRowData['bonusScore'];
        return {
          ...prev,
          bonusScore: { ...prev.bonusScore, [key]: parseInt(value) || 0 },
        };
      }
      if (name.startsWith('exerciseScore.')) {
        const key = name.split('.')[1] as keyof TableRowData['exerciseScore'];
        return {
          ...prev,
          exerciseScore: { ...prev.exerciseScore, [key]: checked },
        };
      }
      return { ...prev, [name]: type === 'checkbox' ? checked : value };
    });
  };

  const handleSubmit = () => {
    onSubmit(editedStudent);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
      <div className="bg-white border-zinc-300 text-zinc-800 rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] mx-4">
        <div className="flex justify-between items-center p-6 border-b border-zinc-200">
          <h3 className="text-xl font-semibold">
            Edit Scores - {editedStudent.name}
          </h3>
          <button
            className="cursor-pointer text-zinc-400 hover:text-zinc-600 text-2xl leading-none p-1"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {/* Basic Info - Read Only */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Name
              </label>
              <p className="text-lg font-medium text-zinc-900 py-2">
                {editedStudent.name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Group
              </label>
              <p className="text-lg font-medium text-zinc-900 py-2">
                {editedStudent.group}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="attendance"
              id="form-attendance"
              checked={editedStudent.attendance}
              onChange={handleChange}
              className="h-5 w-5 text-orange-600 border-zinc-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="form-attendance" className="block text-sm font-medium text-zinc-900">
              Attended This Week
            </label>
          </div>

          {/* GD Scores */}
          <fieldset className="border border-zinc-200 p-6 rounded-lg bg-zinc-50">
            <legend className="text-sm font-medium text-zinc-700 px-2 bg-white">
              Group Discussion Scores
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-4">
              {(['fa', 'fb', 'fc', 'fd'] as const).map(key => (
                <div key={key}>
                  <label
                    htmlFor={`form-gdScore.${key}`}
                    className="block text-sm font-medium text-zinc-700 mb-2"
                  >
                    {key === 'fa' && 'Communication'}
                    {key === 'fb' && 'Depth of Answer'}
                    {key === 'fc' && 'Technical Fluency'}
                    {key === 'fd' && 'Engagement'}
                  </label>
                  <select
                    name={`gdScore.${key}`}
                    id={`form-gdScore.${key}`}
                    value={editedStudent.gdScore[key]}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-zinc-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  >
                    {scoreOptions.map(val => (
                      <option key={val} value={val}>
                        {val === 0 ? '-' : val}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          {/* Bonus Scores */}
          <fieldset className="border border-zinc-200 p-6 rounded-lg bg-zinc-50">
            <legend className="text-sm font-medium text-zinc-700 px-2 bg-white">
              Bonus Scores
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
              {(['attempt', 'good', 'followUp'] as const).map(key => (
                <div key={key}>
                  <label
                    htmlFor={`form-bonusScore.${key}`}
                    className="block text-sm font-medium text-zinc-700 mb-2"
                  >
                    {key === 'attempt' && 'Bonus Attempted'}
                    {key === 'good' && 'Answer Quality'}
                    {key === 'followUp' && 'Follow Up'}
                  </label>
                  <select
                    name={`bonusScore.${key}`}
                    id={`form-bonusScore.${key}`}
                    value={editedStudent.bonusScore[key]}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-zinc-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  >
                    {scoreOptions.map(val => (
                      <option key={val} value={val}>
                        {val === 0 ? '-' : val}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          {/* Exercise Scores */}
          <fieldset className="border border-zinc-200 p-6 rounded-lg bg-zinc-50">
            <legend className="text-sm font-medium text-zinc-700 px-2 bg-white">
              Exercise Scores
            </legend>
            <div className="grid grid-cols-2 gap-6 mt-4">
              {(['Submitted', 'privateTest'] as const).map(key => (
                <div key={key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name={`exerciseScore.${key}`}
                    id={`form-exerciseScore.${key}`}
                    checked={editedStudent.exerciseScore[key]}
                    onChange={handleChange}
                    className="h-5 w-5 text-orange-600 border-zinc-300 rounded focus:ring-orange-500"
                  />
                  <label
                    htmlFor={`form-exerciseScore.${key}`}
                    className="block text-sm font-medium text-zinc-900"
                  >
                    {key === 'Submitted' && 'Submitted'}
                    {key === 'privateTest' && 'Tests Passing'}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex justify-end items-center p-6 border-t border-zinc-200 space-x-4 bg-zinc-50">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-6 py-3 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="cursor-pointer px-6 py-3 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
          >
            Save Scores
          </button>
        </div>
      </div>
    </div>
  );
};