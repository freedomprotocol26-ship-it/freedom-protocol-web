const patientProtocolRepository = require('../repositories/patientProtocol.repository');
const protocolVersionRepository = require('../repositories/protocolVersion.repository');
const protocolPhaseRepository = require('../repositories/protocolPhase.repository');
const protocolActionRepository = require('../repositories/protocolAction.repository');
const doctorOverrideRepository = require('../repositories/doctorOverride.repository');

/**
 * Entry point WITH patient context
 * This is the ONLY place patient identity is allowed.
 */
const assembleProtocolForPatient = async ({ patientId, viewerRole }) => {
  const assignment = await patientProtocolRepository.getPatientProtocol(patientId);
  if (!assignment) {
    throw new Error(`No protocol assigned to patient: ${patientId}`);
  }

  const overrides =
    viewerRole === 'doctor'
      ? await doctorOverrideRepository.getOverridesForPatientAndVersion(
          patientId,
          assignment.protocol_version_id
        )
      : [];

  return assembleProtocolByVersion({
    protocolVersionId: assignment.protocol_version_id,
    viewerRole,
    overrides
  });
};

/**
 * Entry point WITHOUT patient identity
 * Contract-safe: version-scoped only
 */
const assembleProtocolByVersion = async ({
  protocolVersionId,
  viewerRole,
  overrides = []
}) => {
  const version = await protocolVersionRepository.getVersionById(protocolVersionId);
  if (!version) {
    throw new Error(`Protocol version not found: ${protocolVersionId}`);
  }

  const phases = await protocolPhaseRepository.getPhasesByVersionId(protocolVersionId);
  const overrideMap = buildOverrideMap(overrides);

  const assembledPhases = await Promise.all(
    phases.map(async (phase) => {
      const actions = await protocolActionRepository.getActionsByPhaseId(phase.id);

      const resolvedActions = actions.map((action) => {
        const actionOverride = overrideMap.actions[action.id];

        if (actionOverride) {
          return applyOverride(action, actionOverride, viewerRole);
        }

        return viewerRole === 'doctor'
          ? { ...action, override_applied: false }
          : action;
      });

      const phaseOverride = overrideMap.phases[phase.id];

      if (phaseOverride) {
        return applyOverride(
          { ...phase, actions: resolvedActions },
          phaseOverride,
          viewerRole
        );
      }

      return viewerRole === 'doctor'
        ? { ...phase, actions: resolvedActions, override_applied: false }
        : { ...phase, actions: resolvedActions };
    })
  );

  const versionOverride = overrideMap.versions[protocolVersionId];

  if (versionOverride) {
    return applyOverride(
      { version, phases: assembledPhases },
      versionOverride,
      viewerRole
    );
  }

  return {
    version,
    phases: assembledPhases,
    ...(viewerRole === 'doctor' && { override_applied: false })
  };
};

/**
 * INTERNAL HELPERS (allowed)
 */

const buildOverrideMap = (overrides) => {
  const map = {
    versions: {},
    phases: {},
    actions: {}
  };

  overrides.forEach((override) => {
    if (override.protocol_action_id) {
      map.actions[override.protocol_action_id] = override;
    } else if (override.protocol_phase_id) {
      map.phases[override.protocol_phase_id] = override;
    } else if (override.protocol_version_id) {
      map.versions[override.protocol_version_id] = override;
    }
  });

  return map;
};

const applyOverride = (baseItem, override, viewerRole) => {
  const merged = {
    ...baseItem,
    ...override.override_payload
  };

  if (viewerRole === 'doctor') {
    merged.override_applied = true;
    merged.override_metadata = {
      override_id: override.id,
      override_type: override.override_type,
      doctor_id: override.doctor_id,
      reason: override.reason,
      created_at: override.created_at
    };
  }

  return merged;
};

module.exports = {
  assembleProtocolForPatient,
  assembleProtocolByVersion
};
