'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

interface Post {
  id: string;
  timestamp: string;
  story?: string;
  filename: string;
  type: string;
  likes: number;
  comments: number;
  shares: number;
}

export default function GridPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [displayedPost, setDisplayedPost] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHoveredPostRef = useRef<string | null>(null);
  
  // Determine basePath based on whether we're in static export or server mode
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/latent-self') ? '/latent-self' : '';

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      
      let fetchedData: Post[] = [];
      
      // Try to load from static posts.json first (for static exports)
      try {
        const staticResponse = await fetch(`${basePath}/posts.json`);
        if (staticResponse.ok) {
          fetchedData = await staticResponse.json();
          console.log('Loaded posts from static file:', fetchedData);
        }
      } catch (e) {
        // Static file doesn't exist, try API
      }
      
      // Fallback to API (for server mode)
      if (fetchedData.length === 0) {
        const response = await fetch(`${basePath}/api/posts`);
        fetchedData = await response.json();
        console.log('Loaded posts from API:', fetchedData);
      }
      
      setAllPosts(fetchedData);
      
      // Randomize default image on load
      if (fetchedData.length > 0) {
        const randomIndex = Math.floor(Math.random() * fetchedData.length);
        const randomPostId = fetchedData[randomIndex].id;
        setDisplayedPost(randomPostId);
        lastHoveredPostRef.current = randomPostId; // Initialize ref with random post
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || allPosts.length === 0) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;
    const containerHeight = containerRect.height;
    
    // Calculate which post is being hovered based on visible strip position
    const postHeight = containerHeight / allPosts.length;
    const hoveredIndex = Math.floor(mouseY / postHeight);
    
    if (hoveredIndex >= 0 && hoveredIndex < allPosts.length) {
      const post = allPosts[hoveredIndex];
      // Only set hover if mouse is actually over a visible part of the strip
      const postTop = hoveredIndex * postHeight;
      const postBottom = postTop + postHeight;
      
      if (mouseY >= postTop && mouseY <= postBottom) {
        const newPostId = post.id;
        setHoveredPost(newPostId);
        setDisplayedPost(newPostId); // Always update displayed post when hovering
        lastHoveredPostRef.current = newPostId; // Track the last hovered post
      }
    }
  };

  const handleMouseLeave = () => {
    // Keep the last hovered post as displayed when mouse leaves
    // Use the ref to ensure we have the most recent hovered post
    if (lastHoveredPostRef.current) {
      setDisplayedPost(lastHoveredPostRef.current);
    }
    setHoveredPost(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#000000' }}>
        <div className="text-center">
          <h1 className="text-2xl mb-4" style={{ color: '#ffffff' }}>Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#000000', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <main 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ 
          width: '100%', 
          height: '100%', 
          padding: 0, 
          margin: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Single container - only render ONE image at a time (currently hovered or last displayed) */}
        {(() => {
          const post = displayedPost 
            ? allPosts.find(p => p.id === displayedPost)
            : null;
          
          if (!post) return null;
          
          const isHovered = hoveredPost === post.id;
          
          return (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                transition: 'transform 0.3s ease, filter 0.3s ease',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                cursor: 'pointer',
              }}
            >
              {/* Image */}
              <div className="relative w-full h-full">
                <Image
                  key={post.id}
                  src={`${basePath}/db/${post.filename}`}
                  alt={`AI Generated Art - ${post.type}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority
                  unoptimized
                  style={{ 
                    filter: isHovered
                      ? 'contrast(0.9) saturate(1.1) brightness(1.15) hue-rotate(0deg)'
                      : 'contrast(0.75) saturate(0.9) brightness(1.08) hue-rotate(-4deg)',
                    transition: 'filter 0.3s ease'
                  }}
                />
                {/* Gingham-style overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to bottom, rgba(138,153,179,0.3) 0%, rgba(100,130,160,0.18) 50%, rgba(160,170,190,0.22) 100%)',
                  mixBlendMode: 'overlay',
                  pointerEvents: 'none',
                  opacity: isHovered ? 0.5 : 1,
                  transition: 'opacity 0.3s ease'
                }}></div>
                {/* Additional haze */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, rgba(240,245,255,0.12) 50%, transparent 80%)',
                  mixBlendMode: 'soft-light',
                  pointerEvents: 'none',
                  opacity: isHovered ? 0.5 : 1,
                  transition: 'opacity 0.3s ease'
                }}></div>
                {/* Vignette effect */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.6) 100%)',
                  pointerEvents: 'none',
                  opacity: isHovered ? 0.3 : 1,
                  transition: 'opacity 0.3s ease'
                }}></div>
              </div>
            </div>
          );
        })()}

        {allPosts.length === 0 && (
          <section className="text-center py-32" style={{ color: '#9ca3af' }}>
            <h2 className="text-2xl mb-2">No posts found</h2>
          </section>
        )}
      </main>
    </div>
  );
}

