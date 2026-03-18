import axios from 'axios';

export async function getEligibleCandidates(roundId) {
  try {
    const res = await axios.get(`/api/rounds/${roundId}/eligible-candidates`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to fetch eligible candidates');
  }
}

export async function getInterviewers() {
  try {
    const res = await axios.get('/api/interviewers');
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to fetch interviewers');
  }
}

export async function scheduleInterview(roundId, interviewData) {
  try {
    const res = await axios.post(`/api/rounds/${roundId}/schedule-interview`, interviewData);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to schedule interview');
  }
}

export async function getScheduledInterviews(roundId) {
  try {
    const res = await axios.get(`/api/rounds/${roundId}/candidate-rounds`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to fetch scheduled interviews');
  }
} 