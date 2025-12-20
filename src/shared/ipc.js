"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
exports.IPC_CHANNELS = {
    DB_GET_SESSIONS: 'db:get-sessions',
    DB_GET_SESSION: 'db:get-session',
    DB_CREATE_SESSION: 'db:create-session',
    DB_UPDATE_SESSION: 'db:update-session',
    DB_DELETE_SESSION: 'db:delete-session',
    DB_GET_TRANSCRIPT_SEGMENTS: 'db:get-transcript-segments',
    DB_ADD_TRANSCRIPT_SEGMENT: 'db:add-transcript-segment',
    DB_SET_SUMMARY: 'db:set-summary',
    DB_SET_FEEDBACK: 'db:set-feedback',
    SETTINGS_GET: 'settings:get',
    SETTINGS_SET: 'settings:set',
    AUDIO_GET_DEVICES: 'audio:get-devices',
    AUDIO_START_CAPTURE: 'audio:start-capture',
    AUDIO_STOP_CAPTURE: 'audio:stop-capture',
    AUDIO_SET_MIC_MUTED: 'audio:set-mic-muted',
    AUDIO_PEAK_LEVEL: 'audio:peak-level',
    REALTIME_CONNECT: 'realtime:connect',
    REALTIME_DISCONNECT: 'realtime:disconnect',
    REALTIME_EVENT: 'realtime:event',
    REALTIME_REQUEST_SUGGESTION: 'realtime:request-suggestion',
    CALL_START: 'call:start',
    CALL_END: 'call:end',
    CALL_FINALIZE_STATUS: 'call:finalize-status',
};
