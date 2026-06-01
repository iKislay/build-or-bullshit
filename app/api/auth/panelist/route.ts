import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Panelist from '@/models/Panelist';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { roomCode, panelistCode } = await request.json();

    if (!roomCode || !panelistCode) {
      return NextResponse.json(
        { error: 'Room code and panelist code are required' },
        { status: 400 }
      );
    }

    const panelist = await Panelist.findOne({ code: panelistCode });

    if (!panelist) {
      return NextResponse.json(
        { error: 'Invalid panelist code' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      role: 'panelist',
      panelistId: panelist._id.toString(),
      name: panelist.name,
      roomCode,
      sessionId: Math.random().toString(36).substring(7),
    });
  } catch (error) {
    console.error('Panelist login error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
