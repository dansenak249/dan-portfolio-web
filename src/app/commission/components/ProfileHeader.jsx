'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import avatarImg from '../assets/avatar.webp'
import coverImg from '../assets/cover.webp'
import coverGif from '../assets/cover-gif.webp'

const ProfileHeader = () => {
  const coverRef = useRef(null)
  const avatarFrameRef = useRef(null)
  const spineCanvasRef = useRef(null)
  const spinePlayerRef = useRef(null)
  const animationFrameRef = useRef(0)
  const animationIntervalRef = useRef(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const rafIdRef = useRef(null)
  const mountTimeRef = useRef(null)
  
  // FIX: Use .src for Next.js image objects in state, but store the whole object for JSX
  const [currentCover, setCurrentCover] = useState(coverImg)
  const [coverGifLoaded, setCoverGifLoaded] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [spineLoaded, setSpineLoaded] = useState(false)
  const [showSpine, setShowSpine] = useState(true)
  const [interactionEnabled, setInteractionEnabled] = useState(false)
  
  // FIX: SSR-safe - store avatarSize in state, calculate after mount
  const [avatarSize, setAvatarSize] = useState(272)
  const [isMounted, setIsMounted] = useState(false)

  const AVATAR_CONFIG = {
    size: {
      mobile: 224,
      desktop: 272
    },
    offsetY: '12px',
    offsetX: '-8px',
    borderWidth: '8px',
    interactionDelay: 2000,
    spineConfig: {
      jsonUrl: '/commission/spine2d/character.json',
      atlasUrl: '/commission/spine2d/character.atlas',
      idleAnimation: 'idle',
      interactAnimation: 'interact',
      boneName: 'cursor',
      canvasBoneName: 'canvas',
      canvasSize: 288,
      fps: 24,
      scale: 1.0,
      eyeTrackingRange: 2.0
    },
    hoverAnimation: {
      fps: 24,
      shakeFrame: 1,
      returnFrame: 50,
      shakeOffset: { x: 80, y: 0 },
      shakeDuration: 0.5,
      returnDuration: 1.5
    }
  }

  // FIX: Handle SSR - calculate avatar size after mount
  useEffect(() => {
    setIsMounted(true)
    const size = window.innerWidth >= 640 ? AVATAR_CONFIG.size.desktop : AVATAR_CONFIG.size.mobile
    setAvatarSize(size)
    
    // Handle resize
    const handleResize = () => {
      const newSize = window.innerWidth >= 640 ? AVATAR_CONFIG.size.desktop : AVATAR_CONFIG.size.mobile
      setAvatarSize(newSize)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    
    console.log('=== DEBUG SPINE ===')
    console.log('window.spine exists:', !!window.spine)
    console.log('spineCanvasRef.current:', !!spineCanvasRef.current)
    console.log('showSpine:', showSpine)
    console.log('avatarSize:', avatarSize)
  }, [isMounted])


  useEffect(() => {
    if (!isMounted) return
    
    mountTimeRef.current = Date.now()
    
    const timer = setTimeout(() => {
      setInteractionEnabled(true)
    }, AVATAR_CONFIG.interactionDelay)

    gsap.fromTo(
      coverRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )

    // FIX: Load cover GIF - Access .src for Next.js image imports
    if (coverGif) {
      const img = new Image()
      img.onload = () => {
        setCoverGifLoaded(true)
        setCurrentCover(coverGif)
      }
      img.onerror = () => {
        console.error('Failed to load cover GIF')
        setCoverGifLoaded(false)
      }
      // FIX: Next.js image import is an object, access .src property
      img.src = typeof coverGif === 'string' ? coverGif : coverGif.src
    }

    return () => {
      clearTimeout(timer)
    }
  }, [isMounted])

  const calculateBounds = (skeleton, config) => {
    skeleton.setToSetupPose()
    skeleton.updateWorldTransform()
    
    const canvasBone = skeleton.findBone(config.canvasBoneName)
    
    if (canvasBone) {
      const size = config.canvasSize
      
      return {
        x: canvasBone.worldX - size / 2,
        y: canvasBone.worldY - size / 2,
        width: size,
        height: size
      }
    }
    
    console.warn(`Canvas bone "${config.canvasBoneName}" not found, using fallback calculation`)
    
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    
    const slots = skeleton.slots
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (!slot.bone.active) continue
      
      const attachment = slot.getAttachment()
      if (!attachment) continue
      
      const vertices = []
      if (attachment.computeWorldVertices) {
        attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, 2)
        
        for (let ii = 0; ii < vertices.length; ii += 2) {
          const x = vertices[ii]
          const y = vertices[ii + 1]
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    const width = maxX - minX
    const height = maxY - minY
    
    return { 
      x: minX, 
      y: minY, 
      width: width, 
      height: height 
    }
  }

  // Spine WebGL initialization
  useEffect(() => {
    if (!isMounted || !spineCanvasRef.current || !window.spine || !showSpine) {
      return
    }

    const canvas = spineCanvasRef.current
    const config = AVATAR_CONFIG.spineConfig

    canvas.width = avatarSize
    canvas.height = avatarSize

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true })
    if (!gl) {
      console.error('WebGL not supported')
      return
    }

    const spine = window.spine

    const context = new spine.webgl.ManagedWebGLRenderingContext(gl)
    const assetManager = new spine.webgl.AssetManager(context)

    assetManager.loadText(config.jsonUrl)
    assetManager.loadTextureAtlas(config.atlasUrl)

    const loadSpine = () => {
      if (!assetManager.isLoadingComplete()) {
        requestAnimationFrame(loadSpine)
        return
      }

      try {
        const atlas = assetManager.get(config.atlasUrl)
        const atlasLoader = new spine.AtlasAttachmentLoader(atlas)
        const skeletonJson = new spine.SkeletonJson(atlasLoader)
        const skeletonData = skeletonJson.readSkeletonData(assetManager.get(config.jsonUrl))

        const skeleton = new spine.Skeleton(skeletonData)
        skeleton.setToSetupPose()
        skeleton.updateWorldTransform()

        const animationStateData = new spine.AnimationStateData(skeleton.data)
        const animationState = new spine.AnimationState(animationStateData)
        animationState.setAnimation(0, config.idleAnimation, true)

        const bounds = calculateBounds(skeleton, config)
        
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        const scaleX = (avatarSize - 40) / bounds.width
        const scaleY = (avatarSize - 40) / bounds.height
        const scale = Math.min(scaleX, scaleY) * config.scale

        skeleton.x = avatarSize / 2 - centerX * scale
        skeleton.y = avatarSize / 2 - centerY * scale
        skeleton.scaleX = scale
        skeleton.scaleY = scale

        const shader = spine.webgl.Shader.newTwoColoredTextured(context)
        const batcher = new spine.webgl.PolygonBatcher(context)
        const skeletonRenderer = new spine.webgl.SkeletonRenderer(context)

        let lastFrameTime = Date.now() / 1000

        const render = () => {
          if (!showSpine) {
            rafIdRef.current = null
            return
          }

          const now = Date.now() / 1000
          const delta = now - lastFrameTime
          lastFrameTime = now

          animationState.update(delta)
          animationState.apply(skeleton)
          skeleton.updateWorldTransform()

          const cursorBone = skeleton.findBone(config.boneName)
          
          if (cursorBone) {
            if (!isAnimating) {
              const mouseX = mousePositionRef.current.x
              const mouseY = mousePositionRef.current.y
              const radius = avatarSize / 2

              const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY)
              const normalizedX = distance > 0 ? (mouseX / distance) * radius * config.eyeTrackingRange : 0
              const normalizedY = distance > 0 ? (mouseY / distance) * radius * config.eyeTrackingRange : 0

              cursorBone.x = normalizedX / scale
              cursorBone.y = -normalizedY / scale
            } else {
              cursorBone.x = 0
              cursorBone.y = 0
            }
          }

          gl.clearColor(0, 0, 0, 0)
          gl.clear(gl.COLOR_BUFFER_BIT)

          shader.bind()
          shader.setUniformi(spine.webgl.Shader.SAMPLER, 0)
          shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, [
            2 / canvas.width, 0, 0, 0,
            0, 2 / canvas.height, 0, 0,
            0, 0, 1, 0,
            -1, -1, 0, 1
          ])

          batcher.begin(shader)
          skeletonRenderer.draw(batcher, skeleton)
          batcher.end()
          shader.unbind()

          rafIdRef.current = requestAnimationFrame(render)
        }

        spinePlayerRef.current = { skeleton, animationState, context, shader, batcher, skeletonRenderer, scale }
        setSpineLoaded(true)
        rafIdRef.current = requestAnimationFrame(render)
      } catch (error) {
        console.error('Error loading Spine:', error)
      }
    }

    requestAnimationFrame(loadSpine)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isMounted, showSpine, avatarSize])

  // Mouse tracking for eye follow
  useEffect(() => {
    if (!isMounted) return
    
    const handleMouseMove = (e) => {
      if (!spineCanvasRef.current || isAnimating) return

      const canvas = spineCanvasRef.current
      const rect = canvas.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      mousePositionRef.current = {
        x: e.clientX - centerX,
        y: e.clientY - centerY
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isMounted, isAnimating])

  const handleAvatarHover = () => {
    if (!interactionEnabled || isAnimating || !spinePlayerRef.current) return
    
    setIsHovering(true)
    setIsAnimating(true)
    
    const { animationState } = spinePlayerRef.current
    const config = AVATAR_CONFIG.spineConfig
    const hoverConfig = AVATAR_CONFIG.hoverAnimation
    
    const interactTrack = animationState.setAnimation(0, config.interactAnimation, false)
    const interactDuration = interactTrack.animation.duration
    
    gsap.set(avatarFrameRef.current, { x: 0, y: 0 })

    animationFrameRef.current = 0
    
    const frameInterval = 1000 / hoverConfig.fps
    const totalFrames = Math.ceil(interactDuration * hoverConfig.fps)
    
    const shakeOffsetX = hoverConfig.shakeOffset?.x ?? 8
    const shakeOffsetY = hoverConfig.shakeOffset?.y ?? 0
    const shakeFrame = hoverConfig.shakeFrame ?? 4
    const returnFrame = hoverConfig.returnFrame ?? 50
    const shakeDuration = hoverConfig.shakeDuration ?? 0.1
    const returnDuration = hoverConfig.returnDuration ?? 0.3
    
    animationIntervalRef.current = setInterval(() => {
      const currentFrame = animationFrameRef.current
      
      if (currentFrame === shakeFrame) {
        gsap.to(avatarFrameRef.current, {
          x: shakeOffsetX,
          y: shakeOffsetY,
          duration: shakeDuration,
          ease: 'power4.out'
        })
      }
      
      if (currentFrame === returnFrame) {
        gsap.to(avatarFrameRef.current, {
          x: 0,
          y: 0,
          duration: returnDuration,
          ease: 'elastic.out(1, 0.5)'
        })
      }
      
      if (currentFrame >= totalFrames) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
        
        animationState.setAnimation(0, config.idleAnimation, true)
        
        setTimeout(() => {
          setIsAnimating(false)
          mousePositionRef.current = { x: 0, y: 0 }
        }, 100)
      }
      
      animationFrameRef.current++
    }, frameInterval)
  }

  const handleAvatarLeave = () => {
    setIsHovering(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  // FIX: Helper to get image src for both string and Next.js image objects
  const getImageSrc = (img) => {
    if (!img) return ''
    if (typeof img === 'string') return img
    if (typeof img === 'object' && img.src) return img.src
    return img
  }

  // Show placeholder during SSR
  if (!isMounted) {
    return (
      <div className="relative">
        <div 
          className="h-48 sm:h-64 relative overflow-hidden bg-cover bg-center bg-gray-200"
        />
        <div 
          className="absolute top-0 left-8 z-10"
          style={{ 
            transform: `translateX(${AVATAR_CONFIG.offsetX}) translateY(${AVATAR_CONFIG.offsetY})`
          }}
        >
          <div 
            className="rounded-full bg-white flex items-center justify-center overflow-hidden relative"
            style={{ 
              width: `${AVATAR_CONFIG.size.desktop}px`,
              height: `${AVATAR_CONFIG.size.desktop}px`,
              border: `${AVATAR_CONFIG.borderWidth} solid white`
            }}
          >
            <div className="w-full h-full bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Cover Image */}
      <div 
        ref={coverRef}
        className="h-48 sm:h-64 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${getImageSrc(currentCover)})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-pink-400/10" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-float" />
          <div className="absolute top-20 right-20 w-40 h-40 bg-pink-200 rounded-full blur-3xl animate-pulse" />
        </div>
      </div>

      {/* Avatar Frame */}
      <div 
        className="absolute top-0 left-8 z-10"
        style={{ 
          transform: `translateX(${AVATAR_CONFIG.offsetX}) translateY(${AVATAR_CONFIG.offsetY})`
        }}
      >
        <div 
          ref={avatarFrameRef}
          onMouseEnter={handleAvatarHover}
          onMouseLeave={handleAvatarLeave}
          className="rounded-full bg-white flex items-center justify-center overflow-hidden relative"
          style={{ 
            width: `${avatarSize}px`,
            height: `${avatarSize}px`,
            border: `${AVATAR_CONFIG.borderWidth} solid white`,
            cursor: interactionEnabled ? 'pointer' : 'default'
          }}
        >
          {/* Spine2D Canvas */}
          <canvas
            ref={spineCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ 
              display: showSpine ? 'block' : 'none',
              opacity: spineLoaded ? 1 : 0,
              transition: 'opacity 0.3s'
            }}
          />
          
          {/* Fallback Avatar Image (shown when Spine is disabled or loading) */}
          {(!showSpine || !spineLoaded) && (
            <img 
              src={getImageSrc(avatarImg)}
              alt="Dan Avatar"
              className="w-full h-full object-cover pointer-events-none"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader