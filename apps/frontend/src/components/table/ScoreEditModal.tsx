import React, { useState } from 'react';
import type { TableRowData } from '../../types/student';

interface ScoreEditModalProps {
  student: TableRowData;
  cohortId: string;
  weekId: string;
  cohortType?: string;
  onSubmit: (studentData: TableRowData) => void;
  onClose: () => void;
}

export const ScoreEditModal: React.FC<ScoreEditModalProps> = ({
  student,
  cohortType,
  onSubmit,
  onClose,
}) => {
  const [editedStudent, setEditedStudent] = useState<TableRowData>({ ...student });
  const showExerciseScores = cohortType !== 'MASTERING_BITCOIN';

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
        // Handle attempt as checkbox (0 or 1), others as number inputs
        if (key === 'attempt') {
          return {
            ...prev,
            bonusScore: { ...prev.bonusScore, [key]: checked ? 1 : 0 },
          };
        }
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
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] mx-4 border-0">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-0">
          <h3 className="text-xl font-semibold text-zinc-100">
            Edit Scores - {editedStudent.name} - {editedStudent.group}
          </h3>
          <button
            className="border-0 bg-transparent cursor-pointer text-zinc-400 hover:text-zinc-200 text-3xl leading-none transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-8 overflow-y-auto">
          {/* Attendance Checkbox */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="attendance"
              id="form-attendance"
              checked={editedStudent.attendance}
              onChange={handleChange}
              className="h-5 w-5 text-orange-500 bg-zinc-800 border-0 rounded focus:ring-orange-500 focus:ring-offset-0"
            />
            <label htmlFor="form-attendance" className="text-base font-medium text-zinc-200">
              Attended This Week
            </label>
          </div>

          {/* Group Discussion Scores */}
          <div className="space-y-4">
            <h4 className="text-base font-medium text-zinc-200">Group Discussion Scores</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['fa', 'fb', 'fc', 'fd'] as const).map(key => (
                <div key={key}>
                  <label
                    htmlFor={`form-gdScore.${key}`}
                    className="block text-sm font-medium text-zinc-400 mb-2"
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
                    className="block w-full pl-4 pr-10 py-3 bg-zinc-800 border-0 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(161 161 170)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[center_right_0.75rem] bg-no-repeat"
                  >
                    {scoreOptions.map(val => (
                      <option key={val} value={val} className="bg-zinc-800 text-zinc-200">
                        {val === 0 ? '-' : val}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus Scores */}
          <div className="space-y-4">
            <h4 className="text-base font-medium text-zinc-200">Bonus Scores</h4>

            {/* Bonus Attempted Checkbox */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="bonusScore.attempt"
                id="form-bonusScore.attempt"
                checked={editedStudent.bonusScore.attempt > 0}
                onChange={handleChange}
                className="h-5 w-5 text-orange-500 bg-zinc-800 border-0 rounded focus:ring-orange-500 focus:ring-offset-0"
              />
              <label htmlFor="form-bonusScore.attempt" className="text-base font-medium text-zinc-200">
                Bonus Attempted
              </label>
            </div>

            {/* Other Bonus Score Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['good', 'followUp'] as const).map(key => (
                <div key={key}>
                  <label
                    htmlFor={`form-bonusScore.${key}`}
                    className="block text-sm font-medium text-zinc-400 mb-2"
                  >
                    {key === 'good' && 'Answer Quality'}
                    {key === 'followUp' && 'Follow Up'}
                  </label>
                  <select
                    name={`bonusScore.${key}`}
                    id={`form-bonusScore.${key}`}
                    value={editedStudent.bonusScore[key]}
                    onChange={handleChange}
                    className="block w-full pl-4 pr-10 py-3 bg-zinc-800 border-0 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(161 161 170)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[center_right_0.75rem] bg-no-repeat"
                  >
                    {scoreOptions.map(val => (
                      <option key={val} value={val} className="bg-zinc-800 text-zinc-200">
                        {val === 0 ? '-' : val}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Exercise Scores */}
          {showExerciseScores && (
            <div className="space-y-4">
              <h4 className="text-base font-medium text-zinc-200">Exercise Scores</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['Submitted', 'privateTest'] as const).map(key => (
                  <div key={key} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name={`exerciseScore.${key}`}
                      id={`form-exerciseScore.${key}`}
                      checked={editedStudent.exerciseScore[key]}
                      onChange={handleChange}
                      className="h-5 w-5 text-orange-500 bg-zinc-800 border-0 rounded focus:ring-orange-500 focus:ring-offset-0"
                    />
                    <label
                      htmlFor={`form-exerciseScore.${key}`}
                      className="text-base font-medium text-zinc-200"
                    >
                      {key === 'Submitted' && 'Submitted'}
                      {key === 'privateTest' && 'Tests Passing'}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center px-8 py-6 border-0 space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="border-0 px-8 py-3 text-sm font-semibold text-zinc-300 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="border-0 px-8 py-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-all duration-200"
          >
            Save Scores
          </button>
        </div>
      </div>
    </div>
  );
};
