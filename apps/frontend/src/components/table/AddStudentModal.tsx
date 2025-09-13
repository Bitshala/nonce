import React, { useState } from 'react';
import type { TableRowData } from '../../types/student';

interface AddStudentModalProps {
  baseGroups: string[];
  week: number;
  onSubmit: (student: Omit<TableRowData, 'id' | 'total' | 'week'>) => void;
  onClose: () => void;
}

const initialFormState: Omit<TableRowData, 'id' | 'total' | 'week'> = {
  name: '',
  email: '',
  group: '',
  ta: '',
  attendance: false,
  gdScore: { fa: 0, fb: 0, fc: 0, fd: 0 },
  bonusScore: { attempt: 0, good: 0, followUp: 0 },
  exerciseScore: {
    Submitted: false,
    privateTest: false,
    goodStructure: false,
    goodDoc: false,
  },
};

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  baseGroups,
  week,
  onSubmit,
  onClose,
}) => {
  const [newStudent, setNewStudent] = useState<Omit<TableRowData, 'id' | 'total' | 'week'>>({
    ...initialFormState,
    group: baseGroups[0] || 'Group 0',
  });

  const scoreOptions = [0, 1, 2, 3, 4, 5];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setNewStudent(prev => {
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
    if (!newStudent.name.trim()) {
      alert('Student name is required.');
      return;
    }
    onSubmit(newStudent);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white border-zinc-300 text-zinc-800 rounded-lg shadow-xl flex flex-col w-full max-w-2xl max-h-90vh">
        <div className="flex justify-between items-center p-4 border-b border-zinc-200">
          <h3 className="text-xl font-semibold">
            Add New Student (Week {week})
          </h3>
          <button
            className="cursor-pointer text-zinc-400 hover:text-zinc-600 text-2xl leading-none p-1"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Basic Info */}
          <div>
            <label htmlFor="form-name" className="block text-sm font-medium text-zinc-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="form-name"
              value={newStudent.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="form-email" className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="form-email"
              value={newStudent.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="form-group" className="block text-sm font-medium text-zinc-700">
              Group
            </label>
            <select
              name="group"
              id="form-group"
              value={newStudent.group}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-zinc-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            >
              {baseGroups.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="form-ta" className="block text-sm font-medium text-zinc-700">
              TA
            </label>
            <input
              type="text"
              name="ta"
              id="form-ta"
              value={newStudent.ta}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="attendance"
              id="form-attendance"
              checked={newStudent.attendance}
              onChange={handleChange}
              className="h-4 w-4 text-orange-600 border-zinc-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="form-attendance" className="ml-2 block text-sm text-zinc-900">
              Attended This Week
            </label>
          </div>

          {/* GD Scores */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium text-zinc-700 px-1">
              GD Scores
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              {(['fa', 'fb', 'fc', 'fd'] as const).map(key => (
                <div key={key}>
                  <label
                    htmlFor={`form-gdScore.${key}`}
                    className="block text-xs font-medium text-zinc-600 capitalize"
                  >
                    {key.replace('f', 'Factor ')}
                  </label>
                  <select
                    name={`gdScore.${key}`}
                    id={`form-gdScore.${key}`}
                    value={newStudent.gdScore[key]}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-zinc-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium text-zinc-700 px-1">
              Bonus Scores
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              {(['attempt', 'good', 'followUp'] as const).map(key => (
                <div key={key}>
                  <label
                    htmlFor={`form-bonusScore.${key}`}
                    className="block text-xs font-medium text-zinc-600 capitalize"
                  >
                    {key}
                  </label>
                  <select
                    name={`bonusScore.${key}`}
                    id={`form-bonusScore.${key}`}
                    value={newStudent.bonusScore[key]}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-zinc-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium text-zinc-700 px-1">
              Exercise Scores
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-2">
              {(Object.keys(newStudent.exerciseScore) as Array<keyof TableRowData['exerciseScore']>).map(key => (
                <div key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    name={`exerciseScore.${key}`}
                    id={`form-exerciseScore.${key}`}
                    checked={newStudent.exerciseScore[key]}
                    onChange={handleChange}
                    className="h-4 w-4 text-orange-600 border-zinc-300 rounded focus:ring-orange-500"
                  />
                  <label
                    htmlFor={`form-exerciseScore.${key}`}
                    className="ml-2 block text-sm text-zinc-900 capitalize"
                  >
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
        
        <div className="flex justify-end items-center p-4 border-t border-zinc-200 space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Add Student
          </button>
        </div>
      </div>
    </div>
  );
};