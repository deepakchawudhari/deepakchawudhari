"use client"

import { useEffect, useRef } from "react"

interface DataPoint {
  [key: string]: string | number
}

interface LineChartProps {
  data: DataPoint[]
  xKey: string
  yKey: string
  color: string
  fillColor: string
}

export function LineChart({
  data,
  xKey,
  yKey,
  color = "#3b82f6",
  fillColor = "rgba(59, 130, 246, 0.1)",
}: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // If we only have one data point, we can't draw a line
    if (data.length === 1) {
      const item = data[0]
      const x = rect.width / 2
      const y = rect.height / 2

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()

      // Draw label
      ctx.fillStyle = "#6b7280"
      ctx.font = "10px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(String(item[xKey]), x, rect.height - 5)

      return
    }

    // Extract values
    const yValues = data.map((item) => Number(item[yKey]))
    const minY = Math.min(...yValues) * 0.98
    const maxY = Math.max(...yValues) * 1.02

    // Calculate dimensions
    const padding = { top: 10, right: 10, bottom: 20, left: 30 }
    const chartWidth = rect.width - padding.left - padding.right
    const chartHeight = rect.height - padding.top - padding.bottom

    // Add points to create the wave effect
    const points: [number, number][] = []
    data.forEach((item, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth
      const normalizedY = 1 - (Number(item[yKey]) - minY) / (maxY - minY)
      const y = padding.top + normalizedY * chartHeight
      points.push([x, y])
    })

    // Draw the line
    if (points.length > 0) {
      ctx.beginPath()
      ctx.moveTo(points[0][0], points[0][1])

      // Use bezier curves for smooth lines
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i][0] + points[i + 1][0]) / 2
        const yc = (points[i][1] + points[i + 1][1]) / 2
        ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc)
      }

      // Last point
      if (points.length > 1) {
        ctx.quadraticCurveTo(
          points[points.length - 2][0],
          points[points.length - 2][1],
          points[points.length - 1][0],
          points[points.length - 1][1],
        )
      }

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()

      // Fill area under the line
      ctx.lineTo(points[points.length - 1][0], padding.top + chartHeight)
      ctx.lineTo(padding.left, padding.top + chartHeight)
      ctx.fillStyle = fillColor
      ctx.fill()
    }

    // Draw x-axis labels (first and last only to avoid clutter)
    if (data.length > 0) {
      ctx.fillStyle = "#6b7280"
      ctx.font = "10px sans-serif"
      ctx.textAlign = "center"

      ctx.fillText(String(data[0][xKey]), padding.left, rect.height - 5)

      if (data.length > 1) {
        ctx.fillText(String(data[data.length - 1][xKey]), padding.left + chartWidth, rect.height - 5)
      }
    }
  }, [data, xKey, yKey, color, fillColor])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
