import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password === process.env.HOST_PASSWORD) {
    return NextResponse.json({
      role: 'host',
      name: 'Host',
      sessionId: Math.random().toString(36).substring(7),
    });
  }

  for (let i = 1; i <= 10; i++) {
    const envKey = `PANEL_${i}_PASSWORD`;
    const panelPassword = process.env[envKey];
    if (panelPassword && password === panelPassword) {
      return NextResponse.json({
        role: 'panelist',
        name: `Panelist ${i}`,
        sessionId: Math.random().toString(36).substring(7),
      });
    }
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
