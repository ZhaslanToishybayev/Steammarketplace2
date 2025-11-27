import * as React from "react"

const AvatarContext = React.createContext<{ size?: number } | null>(null)

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { size?: number }
>(({ className, size = 40, ...props }, ref) => (
  <AvatarContext.Provider value={{ size }}>
    <div
      ref={ref}
      className={`relative flex h-${size} w-${size} shrink-0 overflow-hidden rounded-full ${className}`}
      {...props}
    />
  </AvatarContext.Provider>
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ src, alt, className, ...props }, ref) => {
  const context = React.useContext(AvatarContext)
  const size = context?.size || 40

  return (
    <img
      src={src}
      alt={alt}
      ref={ref}
      className={`aspect-square h-full w-full`}
      style={{ width: size, height: size }}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(AvatarContext)
  const size = context?.size || 40

  return (
    <div
      ref={ref}
      className={`flex h-full w-full items-center justify-center bg-gray-200 text-xs`}
      style={{ width: size, height: size }}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }