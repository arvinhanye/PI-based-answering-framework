import Foundation
import PDFKit
import Vision
import AppKit

// Offline extraction; PDFKit text takes priority, Vision supplements image pages.
let args=CommandLine.arguments
if args.count < 3 { fputs("usage: ocr PDF OUTPUT_DIR [START_PAGE] [END_PAGE]\n",stderr); exit(2) }
let url=URL(fileURLWithPath:args[1]); let out=URL(fileURLWithPath:args[2],isDirectory:true)
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
guard let doc=PDFDocument(url:url) else { fatalError("cannot read PDF") }
let start=args.count>3 ? Int(args[3])! : 1
let end=args.count>4 ? Int(args[4])! : doc.pageCount
for n in start...min(end,doc.pageCount) {
 autoreleasepool {
 let target=out.appendingPathComponent("page-\(n).json")
 if let old=try? Data(contentsOf:target),let result=try? JSONSerialization.jsonObject(with:old) as? [String:Any],result["error"] == nil,let oldLines=result["lines"] as? [[String:Any]],!oldLines.isEmpty { return }
 let page=doc.page(at:n-1)!, bounds=page.bounds(for:.mediaBox)
 let scale:CGFloat=2
 let w=Int(bounds.width*scale),h=Int(bounds.height*scale)
 let cs=CGColorSpaceCreateDeviceRGB()
 let ctx=CGContext(data:nil,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:cs,bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 ctx.setFillColor(NSColor.white.cgColor);ctx.fill(CGRect(x:0,y:0,width:w,height:h));ctx.scaleBy(x:scale,y:scale);page.draw(with:.mediaBox,to:ctx)
 let im=ctx.makeImage()!
 let png=NSBitmapImageRep(cgImage:im).representation(using:.png,properties:[:])!
 try! png.write(to:out.appendingPathComponent("page-\(n).png"))
 let req=VNRecognizeTextRequest();req.recognitionLevel = .accurate;req.recognitionLanguages=["zh-Hans","en-US"];req.usesLanguageCorrection=false
 var err:String? = nil
 do {try VNImageRequestHandler(cgImage:im).perform([req])} catch {err=String(describing:error)}
 var lines:[[String:Any]]=[]
 for obs in req.results ?? [] {
 if let t=obs.topCandidates(1).first {
 let b=obs.boundingBox
 let box:[Double]=[Double(b.minX),Double(1-b.maxY),Double(b.width),Double(b.height)]
 let row:[String:Any]=["text":t.string,"confidence":Double(t.confidence),"bbox":box]
 lines.append(row)
 }
 }
 lines.sort { a,b in
 let aa=a["bbox"] as! [Double]
 let bb=b["bbox"] as! [Double]
 if abs(aa[1]-bb[1])>0.008 {return aa[1]<bb[1]}
 return aa[0]<bb[0]
 }
 var result:[String:Any] = ["page":n,"pageCount":doc.pageCount,"width":w,"height":h,"nativeText":page.string ?? "","lines":lines,"engine":"PDFKit+Vision"]
 if let e=err {result["error"]=e}
 try! JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]).write(to:target,options:.atomic)
 print("page \(n)/\(doc.pageCount): \(lines.count) lines");fflush(stdout)
 }
}
