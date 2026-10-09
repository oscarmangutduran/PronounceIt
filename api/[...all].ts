export default async function handler(req: any, res: any) {
  const mod: any = await import('./index.js');
  const apiHandler = mod.default || mod;
  return apiHandler(req, res);
}
