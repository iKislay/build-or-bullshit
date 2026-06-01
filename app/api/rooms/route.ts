import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Room from '@/models/Room';

export async function DELETE(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    await connectDB();
    const result = await Room.findOneAndUpdate(
      { code, isActive: true },
      { isActive: false }
    );

    if (!result) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();

    const rooms = await Room.find({ isActive: true }).sort({ createdAt: -1 });

    return NextResponse.json(
      rooms.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        code: r.code,
        panelistCount: r.panelists.length,
        projectCount: r.projects.length,
        currentProjectIndex: r.currentProjectIndex,
        createdAt: r.createdAt,
      }))
    );
  } catch (error) {
    console.error('Get rooms error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
