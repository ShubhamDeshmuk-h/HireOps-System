const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Load OAuth credentials from environment variables
function loadCredentialsFromEnv() {
  const credentials = {
    web: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback']
    }
  };
  
  if (!credentials.web.client_id || !credentials.web.client_secret) {
    throw new Error('Missing Google OAuth credentials in environment variables');
  }
  
  return credentials;
}

// Create OAuth2 client from environment variables
function createOAuth2Client() {
  const credentials = loadCredentialsFromEnv();
  const { client_id, client_secret, redirect_uris } = credentials.web;
  
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  
  // Set credentials from environment variables
  const tokens = {
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    scope: process.env.GOOGLE_SCOPE || 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
    token_type: 'Bearer',
    expiry_date: process.env.GOOGLE_TOKEN_EXPIRY ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY) : null
  };
  
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

// Generate random string for request ID
function getRandomString() {
  return `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create Google Calendar event with Google Meet
async function createCalendarEventWithMeet(auth, candidateName, candidateEmail, interviewerEmail, startDateTime, duration = 60, roundName = 'Interview') {
  try {
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Calculate end time
    const startTime = new Date(startDateTime);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    // Event for Google Calendar with Google Meet
    let event = {
      'summary': `${roundName}: ${candidateName}`,
      'description': `${roundName} for ${candidateName}\n\nPlease join the meeting 5 minutes before the scheduled time.\n\nBest regards,\nHR Team`,
      'location': 'Google Meet - Online Interview',
      'attendees': [
        { email: candidateEmail, displayName: candidateName },
        { email: interviewerEmail, displayName: 'HR Interviewer' }
      ],
      'conferenceData': {
        'createRequest': {
          'requestId': getRandomString(),
          'conferenceSolutionKey': { type: "hangoutsMeet" },
        },
      },
      'start': {
        'dateTime': startTime.toISOString(),
        'timeZone': 'Asia/Kolkata',
      },
      'end': {
        'dateTime': endTime.toISOString(),
        'timeZone': 'Asia/Kolkata',
      },
      'reminders': {
        'useDefault': false,
        'overrides': [
          { 'method': 'email', 'minutes': 24 * 60 }, // 1 day before
          { 'method': 'popup', 'minutes': 10 } // 10 minutes before
        ]
      },
      'sendUpdates': 'all' // Send email notifications to all attendees
    };

    console.log('📅 Creating Google Calendar event with Meet...');
    console.log('🕐 Start Time:', startTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    console.log('🕐 End Time:', endTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    console.log('👥 Attendees:', event.attendees.map(a => a.email).join(', '));

    // Insert event with conference data
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });

    const meetLink = response.data.conferenceData?.entryPoints?.[0]?.uri;
    const eventId = response.data.id;
    const htmlLink = response.data.htmlLink;
    
    console.log('✅ Google Calendar event created successfully!');
    console.log('🔗 Meeting Link:', meetLink);
    console.log('🆔 Event ID:', eventId);
    console.log('📅 Calendar Link:', htmlLink);
    
    // Check conference status
    if (response.data.conferenceData?.status?.statusCode === 'success') {
      console.log('🎥 Google Meet conference created successfully!');
    } else if (response.data.conferenceData?.status?.statusCode === 'pending') {
      console.log('⏳ Google Meet conference is being created...');
    }
    
    return { meetLink, eventId, htmlLink };
  } catch (error) {
    console.error('❌ Error creating Google Calendar event:', error);
    if (error.response) {
      console.error('📋 Error details:', error.response.data);
    }
    return null;
  }
}

// Create email transporter
function createTransporter() {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password',
    },
  });
}

// Send email to interviewer
async function sendInterviewerEmail(meetLink, htmlLink, candidateName, candidateEmail, interviewerEmail, startDateTime, duration, roundName) {
  try {
    const transporter = createTransporter();
    
    const interviewDate = new Date(startDateTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });

    const emailContent = {
      from: `ATS HR <${process.env.EMAIL_USER || 'hr@company.com'}>`,
      to: interviewerEmail,
      subject: `📋 ${roundName} Scheduled - ${candidateName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0;">🎯 ${roundName} Scheduled</h1>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
            <p>Dear <strong>Interviewer</strong>,</p>
            <p>You have an interview scheduled with a candidate.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3 style="margin-top: 0; color: #2563eb;">👤 Candidate Details</h3>
              <p><strong>Name:</strong> ${candidateName}</p>
              <p><strong>Email:</strong> ${candidateEmail}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #10b981;">📅 Interview Details</h3>
              <p><strong>Round:</strong> ${roundName}</p>
              <p><strong>Date & Time:</strong> ${interviewDate}</p>
              <p><strong>Duration:</strong> ${duration} minutes</p>
              <p><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${meetLink}</a></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                🎥 Join Meeting
              </a>
              <a href="${htmlLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📅 View in Calendar
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              <strong>HR Team</strong><br>
              ATS System
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(emailContent);
    console.log('✅ Email sent to interviewer successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending email to interviewer:', error);
    return false;
  }
}

// Send email to candidate
async function sendCandidateEmail(meetLink, htmlLink, candidateName, candidateEmail, startDateTime, duration, roundName) {
  try {
    const transporter = createTransporter();
    
    const interviewDate = new Date(startDateTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });

    const emailContent = {
      from: `ATS HR <${process.env.EMAIL_USER || 'hr@company.com'}>`,
      to: candidateEmail,
      subject: `🎯 ${roundName} Scheduled - Please Confirm`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0;">🎯 ${roundName} Confirmed</h1>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
            <p>Dear <strong>${candidateName}</strong>,</p>
            <p>Congratulations! Your interview has been scheduled successfully.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #10b981;">📅 Interview Details</h3>
              <p><strong>Round:</strong> ${roundName}</p>
              <p><strong>Date & Time:</strong> ${interviewDate}</p>
              <p><strong>Duration:</strong> ${duration} minutes</p>
              <p><strong>Interviewer:</strong> HR Team</p>
              <p><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${meetLink}</a></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                🎥 Join Interview
              </a>
              <a href="${htmlLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📅 View in Calendar
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              <strong>HR Team</strong><br>
              ATS System
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(emailContent);
    console.log('✅ Email sent to candidate successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending email to candidate:', error);
    return false;
  }
}

// Main function to schedule interview with Google Calendar
async function scheduleInterviewWithGoogleCalendar(candidateName, candidateEmail, interviewerEmail, startDateTime, duration, roundName) {
  try {
    console.log('🚀 Starting Google Calendar Interview Scheduling...\n');
    
    // Step 1: Create OAuth2 client from environment variables
    console.log('📋 Step 1: Loading credentials from environment variables...');
    const auth = createOAuth2Client();
    console.log('✅ OAuth2 client created successfully!');
    
    // Step 2: Create Google Calendar event with Meet
    console.log('📋 Step 2: Creating Google Calendar Event with Meet');
    const calendarResult = await createCalendarEventWithMeet(
      auth,
      candidateName,
      candidateEmail,
      interviewerEmail,
      startDateTime,
      duration,
      roundName
    );
    
    if (!calendarResult) {
      console.error('❌ Failed to create Google Calendar event');
      return { success: false, error: 'Failed to create Google Calendar event' };
    }
    
    const { meetLink, eventId, htmlLink } = calendarResult;
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Step 3: Send emails
    console.log('📋 Step 3: Sending Emails');
    const interviewerEmailSent = await sendInterviewerEmail(meetLink, htmlLink, candidateName, candidateEmail, interviewerEmail, startDateTime, duration, roundName);
    const candidateEmailSent = await sendCandidateEmail(meetLink, htmlLink, candidateName, candidateEmail, startDateTime, duration, roundName);
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Summary
    console.log('📋 Scheduling Summary:');
    console.log('🔗 Meeting Link:', meetLink);
    console.log('🆔 Event ID:', eventId);
    console.log('📅 Calendar Link:', htmlLink);
    console.log('📧 Interviewer Email:', interviewerEmailSent ? '✅ Sent' : '❌ Failed');
    console.log('📧 Candidate Email:', candidateEmailSent ? '✅ Sent' : '❌ Failed');
    
    return {
      success: true,
      meetLink,
      eventId,
      htmlLink,
      interviewerEmailSent,
      candidateEmailSent
    };
    
  } catch (error) {
    console.error('❌ Interview scheduling failed with error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createCalendarEventWithMeet,
  sendInterviewerEmail,
  sendCandidateEmail,
  createOAuth2Client,
  scheduleInterviewWithGoogleCalendar
};