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
  const [activePost, setActivePost] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(500);
  const mainRef = useRef<HTMLElement>(null);
  const imageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Determine basePath based on whether we're in static export or server mode
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/latent-self') ? '/latent-self' : '';

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setViewportWidth(width);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!mainRef.current || allPosts.length === 0) return;
      
      const scrollTop = mainRef.current.scrollTop;
      const viewportHeight = window.innerHeight;
      const scrollHeight = mainRef.current.scrollHeight;
      const imageHeight = isMobile ? viewportWidth : 500;
      const centerY = scrollTop + viewportHeight / 2;
      
      // Calculate progressive weights based on scroll position
      // Continuous weighting across entire scroll range for smooth transitions
      const maxScrollable = scrollHeight - viewportHeight;
      const scrollProgress = maxScrollable > 0 ? scrollTop / maxScrollable : 0; // 0 at top, 1 at bottom
      
      // Find image with best weighted score
      let bestPost: string | null = null;
      let bestScore = Infinity;
      
      allPosts.forEach((post, index) => {
        const verticalOffset = index * 40; // Increased from 20px to 40px
        const imageTop = verticalOffset;
        const imageCenterY = imageTop + imageHeight / 2;
        
        // Base distance from viewport center
        const distance = Math.abs(imageCenterY - centerY);
        
        // Progressive weighting: apply smooth weighting across entire scroll range
        const normalizedIndex = index / (allPosts.length - 1 || 1); // 0 for first, 1 for last
        
        // Continuous weighting across entire scroll range (not just edge zones)
        // Gentler curves to avoid skipping images
        const topInfluence = Math.max(0, 1 - scrollProgress * 1.5); // Gentler fade from top
        const bottomInfluence = Math.max(0, (scrollProgress - 0.33) * 1.5); // Gentler fade from bottom
        
        // Gentler curve for weighting (using square root for less aggressive transition)
        const topWeightSmooth = Math.sqrt(topInfluence);
        const bottomWeightSmooth = Math.sqrt(bottomInfluence);
        
        // Reduced bonus multiplier for less aggressive weighting
        const bonusMultiplier = imageHeight * 1.5; // Reduced from 3 to 1.5 for gentler transitions
        const topBonus = topWeightSmooth * (1 - normalizedIndex) * bonusMultiplier;
        const bottomBonus = bottomWeightSmooth * normalizedIndex * bonusMultiplier;
        
        // Weighted score: distance minus bonuses (lower is better)
        const weightedScore = distance - topBonus - bottomBonus;
        
        if (weightedScore < bestScore) {
          bestScore = weightedScore;
          bestPost = post.id;
        }
      });
      
      // Ensure absolute edges are reachable
      if (scrollTop <= 5) {
        // At the absolute top, force first image
        setActivePost(allPosts[0].id);
      } else if (scrollTop + viewportHeight >= scrollHeight - 5) {
        // At the absolute bottom, force last image
        setActivePost(allPosts[allPosts.length - 1].id);
      } else if (bestPost) {
        // Otherwise use the weighted calculation
        setActivePost(bestPost);
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      
      return () => {
        mainElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [allPosts, isMobile, viewportWidth]);

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
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
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
        ref={mainRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          padding: 0, 
          margin: 0, 
          overflowX: 'hidden', 
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: isMobile ? '100vw' : '500px',
            minHeight: '100%',
            backgroundColor: '#000000',
            paddingBottom: allPosts.length > 0 ? `${allPosts.length * 40}px` : '0', // Account for vertical offset
          }}
        >
          {allPosts.map((post, index) => {
            const isActive = activePost === post.id;
            // Stack images with z-index based on order, active one on top
            const zIndex = isActive ? allPosts.length + 1 : index + 1;
            // Add vertical offset to create stacked effect (only vertical, no horizontal)
            const verticalOffset = index * 40; // 40px vertical offset per image (increased from 20px)
            
            return (
              <div
                key={post.id}
                ref={(el) => {
                  imageRefs.current[post.id] = el;
                }}
                className="relative group"
                style={{
                  position: 'absolute',
                  top: `${verticalOffset}px`,
                  left: 0, // All images at same x position (vertically stacked)
                  width: isMobile ? '100vw' : '500px',
                  height: isMobile ? '100vw' : '500px', // Square based on width
                  borderRadius: 0,
                  overflow: 'hidden',
                  backgroundColor: '#151318',
                  cursor: 'default',
                  zIndex: zIndex,
                  transition: 'z-index 0s',
                }}
              >
              {/* Image */}
              <div className="relative w-full h-full">
                <Image
                  key={`${post.id}-${isActive ? 'high' : 'low'}`}
                  src={`${basePath}/db/${post.filename}`}
                  alt={`AI Generated Art - ${post.type}`}
                  fill
                  className="object-cover"
                  sizes={isMobile ? '100vw' : '500px'}
                  priority={index < 3}
                  unoptimized
                  style={{ 
                    filter: 'contrast(0.75) saturate(0.9) brightness(1.08) hue-rotate(-4deg)',
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
                }}></div>
              </div>
            </div>
            );
          })}
        </div>

        {allPosts.length === 0 && (
          <section className="text-center py-32" style={{ color: '#9ca3af' }}>
            <h2 className="text-2xl mb-2">No posts found</h2>
          </section>
        )}
      </main>
    </div>
  );
}

