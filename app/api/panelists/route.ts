import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Panelist from '@/models/Panelist';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    let code = generateCode();
    let exists = await Panelist.findOne({ code });

    while (exists) {
      code = generateCode();
      exists = await Panelist.findOne({ code });
    }

    const panelist = await Panelist.create({
      name: name.trim(),
      code,
    });

    return NextResponse.json({
      id: panelist._id.toString(),
      name: panelist.name,
      code: panelist.code,
    });
  } catch (error) {
    console.error('Create panelist error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const panelists = await Panelist.find().sort({ createdAt: -1 });

    return NextResponse.json(
      panelists.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        code: p.code,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    console.error('Get panelists error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
