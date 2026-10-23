import Foundation
import PDFKit
import AppKit
let a=CommandLine.arguments
if a.count<4 {fputs("usage: render PDF PAGE OUTPUT.png [SCALE]\n",stderr);exit(2)}
guard let doc=PDFDocument(url:URL(fileURLWithPath:a[1])),let n=Int(a[2]),n>0,n<=doc.pageCount,let page=doc.page(at:n-1) else {fatalError("invalid PDF/page")}
let scale=a.count>4 ? Double(a[4])! : 2
let b=page.bounds(for:.mediaBox),w=Int(b.width*scale),h=Int(b.height*scale)
let ctx=CGContext(data:nil,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(NSColor.white.cgColor);ctx.fill(CGRect(x:0,y:0,width:w,height:h));ctx.scaleBy(x:scale,y:scale);page.draw(with:.mediaBox,to:ctx)
let data=NSBitmapImageRep(cgImage:ctx.makeImage()!).representation(using:.png,properties:[:])!
try data.write(to:URL(fileURLWithPath:a[3]),options:.atomic)
