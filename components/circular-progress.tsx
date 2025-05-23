"use client"

import { useEffect, useState } from "react"

interface CircularProgressIndicatorProps {
  value: number
  maxValue: number
  size: number
  strokeWidth: number
  color: string
}

export function CircularProgressIndicator({
  value,
  maxValue,
  size = 120,
  strokeWidth = 10,
  color = "#3b82f6",
}: CircularProgressIndicatorProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Animate the progress
    const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100)

    // Start from 0 and animate to the target percentage
    const start = 0
    const animationDuration = 1000 // ms
    const startTime = performance.now()

    const animateProgress = (currentTime: number) => {
      const elapsedTime = currentTime - startTime
      const progressPercentage = Math.min(elapsedTime / animationDuration, 1)
      const currentProgress = progressPercentage * percentage

      setProgress(currentProgress)

      if (progressPercentage < 1) {
        requestAnimationFrame(animateProgress)
      }
    }

    requestAnimationFrame(animateProgress)
  }, [value, maxValue])

  // Calculate the circle properties
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />

      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  )
}
