/**
 * Freedom Protocol - Patient Service
 * Milestone 2 Architecture: Ownership, Self-Access & Subscription Enforcement
 */

const patientRepository = require('../repositories/patient.repository');

/**
 * Subscription tiers and their features
 */
const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  AI_COACH: 'ai_coach',
  PRO: 'pro'
};

const TIER_FEATURES = {
  [SUBSCRIPTION_TIERS.FREE]: ['basic_tracking', 'manual_logging'],
  [SUBSCRIPTION_TIERS.AI_COACH]: ['basic_tracking', 'manual_logging', 'ai_insights', 'ai_chat'],
  [SUBSCRIPTION_TIERS.PRO]: ['basic_tracking', 'manual_logging', 'ai_insights', 'ai_chat', 'doctor_monitoring', 'video_consultation']
};

/**
 * Verify subscription has required feature
 * 
 * @param {Object} subscription - Patient subscription object
 * @param {string} requiredFeature - Feature to check
 * @throws {Error} If subscription doesn't have feature
 */
const enforceSubscriptionGating = (subscription, requiredFeature) => {
  if (!subscription || !subscription.is_active) {
    throw new Error('No active subscription found');
  }

  const tier = subscription.subscription_tier;
  const allowedFeatures = TIER_FEATURES[tier] || [];

  if (!allowedFeatures.includes(requiredFeature)) {
    throw new Error(`Feature '${requiredFeature}' requires ${tier === SUBSCRIPTION_TIERS.FREE ? 'AI Coach' : 'Pro'} subscription`);
  }
};

/**
 * Verify doctor has access to patient
 * 
 * @param {number} doctorUserId - Doctor's user_id
 * @param {number} patientId - Patient's ID
 * @throws {Error} If doctor doesn't have access
 */
const enforceDoctorPatientOwnership = async (doctorUserId, patientId) => {
  const hasAccess = await patientRepository.checkDoctorPatientAssignment(doctorUserId, patientId);
  
  if (!hasAccess) {
    throw new Error('Access denied: Doctor not assigned to this patient');
  }
};

/**
 * Verify patient is accessing their own data
 * 
 * @param {number} patientUserId - Patient's user_id from JWT
 * @param {number} patientId - Patient ID being accessed
 * @throws {Error} If patient IDs don't match
 */
const enforcePatientSelfAccess = async (patientUserId, patientId) => {
  const patient = await patientRepository.getPatientById(patientId);
  
  if (!patient || patient.user_id !== patientUserId) {
    throw new Error('Access denied: Cannot access other patient data');
  }
};

/**
 * Get patient profile (for patient self-access)
 * 
 * @param {number} userId - Patient's user_id from JWT
 * @returns {Promise<Object>} Patient profile
 */
const getMyProfile = async (userId) => {
  try {
    // Get patient by user_id
    const patient = await patientRepository.getPatientByUserId(userId);
    
    if (!patient) {
      throw new Error('Patient profile not found');
    }

    // Get subscription status
    const subscription = await patientRepository.getPatientSubscription(patient.id);

    // Format response
    return {
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        profilePicture: patient.profile_picture_url,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender,
        bloodType: patient.blood_type,
        height: parseFloat(patient.height),
        weight: parseFloat(patient.weight),
        medicalConditions: patient.medical_conditions || [],
        allergies: patient.allergies || [],
        currentMedications: patient.current_medications || [],
        emergencyContact: {
          name: patient.emergency_contact_name,
          phone: patient.emergency_contact_phone
        }
      },
      subscription: subscription ? {
        tier: subscription.subscription_tier,
        isActive: subscription.is_active,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        autoRenew: subscription.auto_renew,
        features: TIER_FEATURES[subscription.subscription_tier] || []
      } : null
    };
  } catch (error) {
    console.error('Error in getMyProfile service:', error);
    throw error;
  }
};

/**
 * Get patient health metrics (for patient self-access)
 * Requires: basic_tracking feature
 * 
 * @param {number} userId - Patient's user_id from JWT
 * @param {number} days - Number of days to retrieve (default: 30)
 * @returns {Promise<Object>} Health metrics
 */
const getMyHealthMetrics = async (userId, days = 30) => {
  try {
    // Get patient
    const patient = await patientRepository.getPatientByUserId(userId);
    
    if (!patient) {
      throw new Error('Patient profile not found');
    }

    // Check subscription (basic_tracking is available to all tiers)
    const subscription = await patientRepository.getPatientSubscription(patient.id);
    enforceSubscriptionGating(subscription, 'basic_tracking');

    // Get health metrics
    const metrics = await patientRepository.getPatientHealthMetrics(patient.id, days);

    return {
      patientId: patient.id,
      period: {
        days: days,
        from: metrics.period_start,
        to: metrics.period_end
      },
      glucose: {
        latest: metrics.latest_glucose ? parseFloat(metrics.latest_glucose) : null,
        average: parseFloat(metrics.avg_glucose),
        min: parseFloat(metrics.min_glucose),
        max: parseFloat(metrics.max_glucose),
        readings: parseInt(metrics.glucose_readings_count, 10),
        trend: metrics.glucose_trend
      },
      bloodPressure: {
        latestSystolic: metrics.latest_systolic ? parseFloat(metrics.latest_systolic) : null,
        latestDiastolic: metrics.latest_diastolic ? parseFloat(metrics.latest_diastolic) : null,
        avgSystolic: parseFloat(metrics.avg_systolic),
        avgDiastolic: parseFloat(metrics.avg_diastolic),
        readings: parseInt(metrics.bp_readings_count, 10)
      },
      weight: {
        latest: metrics.latest_weight ? parseFloat(metrics.latest_weight) : null,
        average: parseFloat(metrics.avg_weight),
        change: parseFloat(metrics.weight_change),
        readings: parseInt(metrics.weight_readings_count, 10)
      },
      activity: {
        totalLogs: parseInt(metrics.total_activity_logs, 10),
        mealsLogged: parseInt(metrics.meals_logged, 10),
        exercisesLogged: parseInt(metrics.exercises_logged, 10)
      }
    };
  } catch (error) {
    console.error('Error in getMyHealthMetrics service:', error);
    throw error;
  }
};

/**
 * Get patient activities (for patient self-access)
 * 
 * @param {number} userId - Patient's user_id from JWT
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Patient activities
 */
const getMyActivities = async (userId, options = {}) => {
  try {
    const { limit = 20, offset = 0, activityType = null } = options;

    // Get patient
    const patient = await patientRepository.getPatientByUserId(userId);
    
    if (!patient) {
      throw new Error('Patient profile not found');
    }

    // Get activities
    const result = await patientRepository.getPatientActivities(patient.id, limit, offset, activityType);

    return {
      activities: result.activities.map(activity => ({
        id: activity.id,
        type: activity.activity_type,
        description: activity.description,
        metadata: activity.metadata,
        timestamp: activity.created_at
      })),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: (result.offset + result.limit) < result.total
      }
    };
  } catch (error) {
    console.error('Error in getMyActivities service:', error);
    throw error;
  }
};

/**
 * Get AI insights for patient (for patient self-access)
 * Requires: ai_insights feature (AI Coach or Pro tier)
 * 
 * @param {number} userId - Patient's user_id from JWT
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Object>} AI insights
 */
const getMyAIInsights = async (userId, days = 7) => {
  try {
    // Get patient
    const patient = await patientRepository.getPatientByUserId(userId);
    
    if (!patient) {
      throw new Error('Patient profile not found');
    }

    // Check subscription (ai_insights requires AI Coach or Pro)
    const subscription = await patientRepository.getPatientSubscription(patient.id);
    enforceSubscriptionGating(subscription, 'ai_insights');

    // Get AI insights
    const insights = await patientRepository.getPatientAIInsights(patient.id, days);

    return {
      patientId: patient.id,
      period: days,
      insights: insights.map(insight => ({
        id: insight.id,
        type: insight.insight_type,
        title: insight.title,
        message: insight.message,
        severity: insight.severity,
        actionable: insight.is_actionable,
        metadata: insight.metadata,
        createdAt: insight.created_at
      }))
    };
  } catch (error) {
    console.error('Error in getMyAIInsights service:', error);
    throw error;
  }
};

/**
 * Get patient profile (for doctor access)
 * Enforces doctor-patient ownership
 * Requires: Patient must have Pro subscription
 * 
 * @param {number} doctorUserId - Doctor's user_id from JWT
 * @param {number} patientId - Patient ID to access
 * @returns {Promise<Object>} Patient profile for doctor
 */
const getPatientProfileForDoctor = async (doctorUserId, patientId) => {
  try {
    // Enforce doctor-patient ownership
    await enforceDoctorPatientOwnership(doctorUserId, patientId);

    // Get patient
    const patient = await patientRepository.getPatientById(patientId);
    
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Check subscription (doctor_monitoring requires Pro tier)
    const subscription = await patientRepository.getPatientSubscription(patientId);
    enforceSubscriptionGating(subscription, 'doctor_monitoring');

    // Get patient health summary
    const healthMetrics = await patientRepository.getPatientHealthMetrics(patientId, 30);
    const recentActivities = await patientRepository.getPatientActivities(patientId, 10, 0);

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        profilePicture: patient.profile_picture_url,
        dateOfBirth: patient.date_of_birth,
        age: patient.age,
        gender: patient.gender,
        bloodType: patient.blood_type,
        height: parseFloat(patient.height),
        weight: parseFloat(patient.weight),
        medicalConditions: patient.medical_conditions || [],
        allergies: patient.allergies || [],
        currentMedications: patient.current_medications || [],
        lastActive: patient.last_active
      },
      healthSummary: {
        glucose: {
          latest: healthMetrics.latest_glucose ? parseFloat(healthMetrics.latest_glucose) : null,
          average: parseFloat(healthMetrics.avg_glucose),
          trend: healthMetrics.glucose_trend
        },
        bloodPressure: {
          latestSystolic: healthMetrics.latest_systolic ? parseFloat(healthMetrics.latest_systolic) : null,
          latestDiastolic: healthMetrics.latest_diastolic ? parseFloat(healthMetrics.latest_diastolic) : null
        },
        weight: {
          latest: healthMetrics.latest_weight ? parseFloat(healthMetrics.latest_weight) : null,
          change: parseFloat(healthMetrics.weight_change)
        }
      },
      recentActivities: recentActivities.activities.slice(0, 5).map(activity => ({
        id: activity.id,
        type: activity.activity_type,
        description: activity.description,
        timestamp: activity.created_at
      })),
      subscription: {
        tier: subscription.subscription_tier,
        isActive: subscription.is_active
      }
    };
  } catch (error) {
    console.error('Error in getPatientProfileForDoctor service:', error);
    throw error;
  }
};

/**
 * Get patient health timeline (for doctor access)
 * Enforces doctor-patient ownership
 * Requires: Patient must have Pro subscription
 * 
 * @param {number} doctorUserId - Doctor's user_id from JWT
 * @param {number} patientId - Patient ID to access
 * @param {number} days - Number of days to retrieve
 * @returns {Promise<Object>} Patient health timeline
 */
const getPatientHealthTimeline = async (doctorUserId, patientId, days = 30) => {
  try {
    // Enforce doctor-patient ownership
    await enforceDoctorPatientOwnership(doctorUserId, patientId);

    // Get patient
    const patient = await patientRepository.getPatientById(patientId);
    
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Check subscription
    const subscription = await patientRepository.getPatientSubscription(patientId);
    enforceSubscriptionGating(subscription, 'doctor_monitoring');

    // Get timeline data
    const timeline = await patientRepository.getPatientHealthTimeline(patientId, days);

    return {
      patientId: patientId,
      patientName: patient.name,
      period: {
        days: days,
        from: timeline.period_start,
        to: timeline.period_end
      },
      readings: timeline.readings.map(reading => ({
        date: reading.reading_date,
        glucose: reading.glucose ? parseFloat(reading.glucose) : null,
        systolic: reading.systolic ? parseFloat(reading.systolic) : null,
        diastolic: reading.diastolic ? parseFloat(reading.diastolic) : null,
        weight: reading.weight ? parseFloat(reading.weight) : null,
        notes: reading.notes
      })),
      summary: {
        totalReadings: timeline.readings.length,
        avgGlucose: parseFloat(timeline.avg_glucose),
        avgSystolic: parseFloat(timeline.avg_systolic),
        avgDiastolic: parseFloat(timeline.avg_diastolic)
      }
    };
  } catch (error) {
    console.error('Error in getPatientHealthTimeline service:', error);
    throw error;
  }
};

/**
 * Get my assigned doctor (for patient self-access)
 * Requires: Patient must have Pro subscription
 * 
 * @param {number} userId - Patient's user_id from JWT
 * @returns {Promise<Object>} Assigned doctor information
 */
const getMyDoctor = async (userId) => {
  try {
    // Get patient
    const patient = await patientRepository.getPatientByUserId(userId);
    
    if (!patient) {
      throw new Error('Patient profile not found');
    }

    // Check subscription
    const subscription = await patientRepository.getPatientSubscription(patient.id);
    enforceSubscriptionGating(subscription, 'doctor_monitoring');

    // Get assigned doctor
    const doctor = await patientRepository.getAssignedDoctor(patient.id);

    if (!doctor) {
      return {
        hasDoctor: false,
        message: 'No doctor assigned yet'
      };
    }

    return {
      hasDoctor: true,
      doctor: {
        id: doctor.doctor_id,
        name: doctor.name,
        specialization: doctor.specialization,
        yearsOfExperience: doctor.years_of_experience,
        rating: parseFloat(doctor.rating),
        totalReviews: doctor.total_reviews,
        consultationFee: parseFloat(doctor.consultation_fee),
        profilePicture: doctor.profile_picture_url,
        bio: doctor.bio
      },
      assignment: {
        assignedDate: doctor.assigned_date,
        isActive: doctor.is_active
      }
    };
  } catch (error) {
    console.error('Error in getMyDoctor service:', error);
    throw error;
  }
};

/**
 * Update patient profile (for patient self-access only)
 * 
 * @param {number} userId - Patient's user_id from JWT
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} Updated patient profile
 */
const updateMyProfile = async (userId, updates) => {
  try {
    // Get patient
    const patient = await patientRepository.getPatientByUserId(userId);
    
    if (!patient) {
      throw new Error('Patient profile not found');
    }

    // Validate and sanitize updates
    const allowedFields = [
      'phone', 'date_of_birth', 'gender', 'blood_type', 'height', 'weight',
      'medical_conditions', 'allergies', 'current_medications',
      'emergency_contact_name', 'emergency_contact_phone'
    ];

    const sanitizedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Update patient
    const updatedPatient = await patientRepository.updatePatient(patient.id, sanitizedUpdates);

    return {
      success: true,
      message: 'Profile updated successfully',
      patient: {
        id: updatedPatient.id,
        phone: updatedPatient.phone,
        dateOfBirth: updatedPatient.date_of_birth,
        gender: updatedPatient.gender,
        bloodType: updatedPatient.blood_type,
        height: parseFloat(updatedPatient.height),
        weight: parseFloat(updatedPatient.weight),
        medicalConditions: updatedPatient.medical_conditions || [],
        allergies: updatedPatient.allergies || [],
        currentMedications: updatedPatient.current_medications || [],
        emergencyContact: {
          name: updatedPatient.emergency_contact_name,
          phone: updatedPatient.emergency_contact_phone
        },
        updatedAt: updatedPatient.updated_at
      }
    };
  } catch (error) {
    console.error('Error in updateMyProfile service:', error);
    throw error;
  }
};

module.exports = {
  // Patient self-access methods
  getMyProfile,
  getMyHealthMetrics,
  getMyActivities,
  getMyAIInsights,
  getMyDoctor,
  updateMyProfile,

  // Doctor access methods
  getPatientProfileForDoctor,
  getPatientHealthTimeline,

  // Utility exports for testing
  SUBSCRIPTION_TIERS,
  TIER_FEATURES
};