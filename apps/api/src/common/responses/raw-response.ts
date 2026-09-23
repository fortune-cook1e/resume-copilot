import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE = Symbol('raw-response');

// For protocol endpoints whose bodies must not be rewritten by the JSON envelope.
export const RawResponse = () => SetMetadata(RAW_RESPONSE, true);
