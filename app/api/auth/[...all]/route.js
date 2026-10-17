import { getAuth } from '@/lib/auth';

const handler = (request) => getAuth().handler(request);

export const GET = handler;
export const POST = handler;
