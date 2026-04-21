import { NextResponse } from 'next/server';

export async function GET() {
  // Mock asset library with cinematic overlays and backgrounds
  const assets = [
    { 
      id: 'fx-glitch', 
      name: 'Digital Glitch Overlay', 
      url: 'https://cdn.pixabay.com/video/2021/04/12/70860-537482322_tiny.mp4', 
      type: 'video/mp4',
      tags: ['fx', 'glitch']
    },
    { 
      id: 'fx-dust', 
      name: 'Cinematic Dust Particles', 
      url: 'https://cdn.pixabay.com/video/2020/05/25/40149-425121415_tiny.mp4', 
      type: 'video/mp4',
      tags: ['fx', 'dust']
    },
    { 
      id: 'fx-smoke', 
      name: 'Ethereal Smoke Flow', 
      url: 'https://cdn.pixabay.com/video/2022/10/05/133682-757657948_tiny.mp4', 
      type: 'video/mp4',
      tags: ['fx', 'smoke']
    },
    { 
      id: 'bg-office', 
      name: 'Modern Office (Blurred)', 
      url: 'https://cdn.pixabay.com/video/2016/09/21/5422-183713023_tiny.mp4', 
      type: 'video/mp4',
      tags: ['bg', 'office']
    },
    { 
      id: 'bg-city', 
      name: 'Cyberpunk City Loops', 
      url: 'https://cdn.pixabay.com/video/2023/11/05/187843-881260461_tiny.mp4', 
      type: 'video/mp4',
      tags: ['bg', 'cyber']
    }
  ];

  return NextResponse.json({
    success: true,
    assets
  });
}
