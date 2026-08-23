import AppKit
import Foundation

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift flatten-ios-icon.swift INPUT OUTPUT\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let image = NSImage(contentsOf: inputURL) else {
    fputs("Could not read input image\n", stderr)
    exit(1)
}

let width = 1024
let height = 1024
var proposedRect = NSRect(origin: .zero, size: image.size)
guard let source = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil),
      let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
      ) else {
    fputs("Could not create graphics context\n", stderr)
    exit(1)
}

context.setFillColor(red: 79.0 / 255.0, green: 70.0 / 255.0, blue: 229.0 / 255.0, alpha: 1)
context.fill(CGRect(x: 0, y: 0, width: width, height: height))
context.interpolationQuality = .high
context.draw(source, in: CGRect(x: 0, y: 0, width: width, height: height))

guard let flattened = context.makeImage(),
      let data = NSBitmapImageRep(cgImage: flattened).representation(using: .png, properties: [:]) else {
    fputs("Could not encode PNG\n", stderr)
    exit(1)
}
try data.write(to: outputURL, options: .atomic)
