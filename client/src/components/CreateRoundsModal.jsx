import React, { useState } from 'react';
import axios from 'axios';

const CreateRoundsModal = ({ isOpen, onClose, jobId, onRoundsCreated }) => {
  const [numberOfRounds, setNumberOfRounds] = useState(1);
  const [currentStep, setCurrentStep] = useState(1);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roundTypes = [
    { value: 'aptitude', label: 'Aptitude Test' },
    { value: 'interview', label: 'Interview' }
  ];

  const handleNumberOfRoundsChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    if (value > 0 && value <= 10) {
      setNumberOfRounds(value);
      // Initialize rounds array
      const newRounds = Array.from({ length: value }, (_, index) => ({
        step: index + 1,
        name: `Round ${index + 1}`,
        type: 'aptitude',
        description: '',
        cutoff: 70
      }));
      setRounds(newRounds);
    }
  };

  const handleRoundChange = (roundIndex, field, value) => {
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex] = {
      ...updatedRounds[roundIndex],
      [field]: value
    };
    setRounds(updatedRounds);
  };

  const handleNext = () => {
    console.log('🔄 handleNext called:', { 
      currentStep, 
      numberOfRounds, 
      roundsLength: rounds.length,
      totalSteps: numberOfRounds + 2 // Step 1 + rounds + summary
    });
    
    if (currentStep === 1) {
      // Move from "number of rounds" to first round configuration
      if (numberOfRounds > 0 && rounds.length > 0) {
        console.log('📝 Moving from step 1 (setup) to step 2 (first round)');
        setCurrentStep(2);
      }
    } else if (currentStep >= 2 && currentStep <= numberOfRounds + 1) {
      // We're in round configuration steps (2 to numberOfRounds + 1)
      if (currentStep === numberOfRounds + 1) {
        // This is the last round, move to summary step
        console.log('📋 Moving to summary step');
        setCurrentStep(numberOfRounds + 2);
      } else {
        // Move to next round
        console.log(`📝 Moving from round ${currentStep - 1} to round ${currentStep}`);
        setCurrentStep(currentStep + 1);
      }
    } else if (currentStep === numberOfRounds + 2) {
      // This is the summary step, create all rounds
      console.log('🚀 Creating all rounds');
      handleCreateRounds();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateRounds = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🚀 Starting round creation process...');
      console.log('📋 Rounds to create:', rounds);
      console.log('🎯 Job ID:', jobId);
      
      // Validate rounds data
      if (!rounds || rounds.length === 0) {
        throw new Error('No rounds data to create');
      }

      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // Get auth token
      const token = localStorage.getItem('token');
      console.log('🔑 Auth token exists:', !!token);

      // Create rounds sequentially
      const createdRounds = [];
      
      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        
        // Validate round data
        if (!round.name || !round.type) {
          throw new Error(`Round ${i + 1} is missing required fields (name or type)`);
        }

        const roundData = {
          job_id: jobId,
          name: round.name.trim(),
          type: round.type,
          description: round.description?.trim() || '',
          cutoff: parseInt(round.cutoff) || 70,
          step: parseInt(round.step) || (i + 1)
        };

        console.log(`🔄 Creating round ${i + 1}/${rounds.length}:`, roundData);
        
        try {
          // Use full URL and include auth headers
          const config = {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          };

          console.log('🌐 Making API call to http://localhost:5000/api/rounds');
          const response = await axios.post('http://localhost:5000/api/rounds', roundData, config);

          if (response.data && response.data._id) {
            createdRounds.push(response.data);
            console.log(`✅ Round ${i + 1} created successfully:`, response.data._id);
          } else {
            throw new Error(`Invalid response for round ${i + 1}`);
          }
        } catch (roundError) {
          console.error(`❌ Failed to create round ${i + 1}:`, roundError);
          console.error('Error response:', roundError.response);
          console.error('Error status:', roundError.response?.status);
          console.error('Error data:', roundError.response?.data);
          
          const errorMessage = roundError.response?.data?.error || 
                              roundError.response?.data?.message || 
                              roundError.message || 
                              'Unknown error';
          throw new Error(`Failed to create round ${i + 1}: ${errorMessage}`);
        }
      }

      console.log('🎉 All rounds created successfully:', createdRounds);
      
      // Notify parent component
      if (onRoundsCreated) {
        onRoundsCreated(createdRounds);
      }

      // Close modal
      onClose();
      
    } catch (err) {
      console.error('❌ Error creating rounds:', err);
      const errorMessage = err.message || 'Failed to create rounds. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNumberOfRounds(1);
    setCurrentStep(1);
    setRounds([]);
    setError('');
    setLoading(false);
    onClose();
  };

  // Helper functions for better readability
  const isSetupStep = () => currentStep === 1;
  const isRoundConfigurationStep = () => currentStep >= 2 && currentStep <= numberOfRounds + 1;
  const isSummaryStep = () => currentStep === numberOfRounds + 2;
  const getCurrentRoundIndex = () => currentStep - 2; // For round configuration steps
  const getCurrentRound = () => rounds[getCurrentRoundIndex()];

  console.log('🔍 CreateRoundsModal render check - isOpen:', isOpen);
  if (!isOpen) {
    console.log('🔍 Modal not open, returning null');
    return null;
  }
  console.log('🔍 Modal is open, rendering...');

  console.log('🔍 Modal state:', { 
    currentStep, 
    numberOfRounds, 
    roundsLength: rounds.length,
    isSetupStep: isSetupStep(),
    isRoundConfigurationStep: isRoundConfigurationStep(),
    isSummaryStep: isSummaryStep(),
    currentRoundIndex: getCurrentRoundIndex(),
    lastRoundStep: numberOfRounds + 1,
    summaryStep: numberOfRounds + 2
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{zIndex: 9999}}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Rounds
            {/* Debug info - remove in production */}
            <span className="text-sm text-gray-500 ml-2">
              (Step {currentStep}/{numberOfRounds + 2})
            </span>
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Number of Rounds Selection */}
          {isSetupStep() && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  How many rounds do you want to create?
                </h3>
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">
                    Number of Rounds:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numberOfRounds}
                    onChange={handleNumberOfRoundsChange}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  You can create between 1 and 10 rounds for this job.
                </p>
              </div>

              {numberOfRounds > 0 && rounds.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Round Summary:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rounds.map((round, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            Round {round.step}
                          </span>
                          <span className="text-sm text-gray-500 capitalize">
                            {round.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {round.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Steps 2 to numberOfRounds+1: Round Configuration */}
          {isRoundConfigurationStep() && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{currentStep - 1} of {numberOfRounds} rounds configured</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep - 1) / numberOfRounds) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Configure Round {currentStep - 1}
                </h3>
                <span className="text-sm text-gray-500">
                  Round {currentStep - 1} of {numberOfRounds}
                </span>
              </div>

              {getCurrentRound() && (
                <div className="space-y-4">
                  {/* Round Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Round Name *
                    </label>
                    <input
                      type="text"
                      value={getCurrentRound().name}
                      onChange={(e) => handleRoundChange(getCurrentRoundIndex(), 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Technical Interview, Aptitude Test"
                    />
                  </div>

                  {/* Round Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Round Type *
                    </label>
                    <select
                      value={getCurrentRound().type}
                      onChange={(e) => handleRoundChange(getCurrentRoundIndex(), 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {roundTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={getCurrentRound().description}
                      onChange={(e) => handleRoundChange(getCurrentRoundIndex(), 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe what this round will cover..."
                    />
                  </div>

                  {/* Cutoff Score */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cutoff Score (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={getCurrentRound().cutoff}
                      onChange={(e) => handleRoundChange(getCurrentRoundIndex(), 'cutoff', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Candidates must score at least this percentage to pass this round.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Final Step: Summary */}
          {isSummaryStep() && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-green-600 text-6xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Create Rounds
                </h3>
                <p className="text-gray-600">
                  Review your round configuration before creating them.
                </p>
              </div>

              <div className="space-y-3">
                {rounds.map((round, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {round.name}
                        </h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {round.type} • Cutoff: {round.cutoff}%
                        </p>
                        {round.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {round.description}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        Round {round.step}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-4">
              <div className="font-medium">Error creating rounds:</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  loading || 
                  (isSetupStep() && (numberOfRounds < 1 || rounds.length === 0)) ||
                  (isRoundConfigurationStep() && getCurrentRound() && (!getCurrentRound().name || !getCurrentRound().type))
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : isSetupStep() ? (
                  'Continue to Configure'
                ) : isRoundConfigurationStep() && currentStep < numberOfRounds + 1 ? (
                  'Next Round'
                ) : isRoundConfigurationStep() && currentStep === numberOfRounds + 1 ? (
                  'Review All Rounds'
                ) : isSummaryStep() ? (
                  'Create All Rounds'
                ) : (
                  'Next'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoundsModal;