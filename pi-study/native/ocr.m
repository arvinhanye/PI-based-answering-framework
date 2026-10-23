#import <Foundation/Foundation.h>
#import <PDFKit/PDFKit.h>
#import <Vision/Vision.h>
#import <AppKit/AppKit.h>
int main(int argc,const char **argv){@autoreleasepool{
 if(argc<3){fprintf(stderr,"usage: ocr PDF OUTPUT_DIR [START] [END]\n");return 2;}
 PDFDocument *doc=[[PDFDocument alloc]initWithURL:[NSURL fileURLWithPath:@(argv[1])]];
 if(!doc){fprintf(stderr,"cannot read PDF\n");return 2;}
 NSString *out=@(argv[2]);[[NSFileManager defaultManager]createDirectoryAtPath:out withIntermediateDirectories:YES attributes:nil error:nil];
 NSInteger start=argc>3?atoi(argv[3]):1,end=argc>4?atoi(argv[4]):doc.pageCount;
 for(NSInteger n=start;n<=MIN(end,doc.pageCount);n++){@autoreleasepool{
 NSString *target=[out stringByAppendingPathComponent:[NSString stringWithFormat:@"page-%ld.json",n]];
 NSData *oldData=[NSData dataWithContentsOfFile:target];NSDictionary *old=oldData?[NSJSONSerialization JSONObjectWithData:oldData options:0 error:nil]:nil;if(old && !old[@"error"] && [old[@"lines"] count]>0)continue;
 PDFPage *page=[doc pageAtIndex:n-1];CGRect bounds=[page boundsForBox:kPDFDisplayBoxMediaBox];CGFloat scale=2;
 size_t w=bounds.size.width*scale,h=bounds.size.height*scale;CGColorSpaceRef cs=CGColorSpaceCreateDeviceRGB();CGContextRef ctx=CGBitmapContextCreate(NULL,w,h,8,w*4,cs,(CGBitmapInfo)kCGImageAlphaPremultipliedLast);CGColorSpaceRelease(cs);
 CGContextSetRGBFillColor(ctx,1,1,1,1);CGContextFillRect(ctx,CGRectMake(0,0,w,h));CGContextScaleCTM(ctx,scale,scale);[page drawWithBox:kPDFDisplayBoxMediaBox toContext:ctx];CGImageRef im=CGBitmapContextCreateImage(ctx);
 NSBitmapImageRep *rep=[[NSBitmapImageRep alloc]initWithCGImage:im];[[rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}]writeToFile:[out stringByAppendingPathComponent:[NSString stringWithFormat:@"page-%ld.png",n]] atomically:YES];
 VNRecognizeTextRequest *request=[[VNRecognizeTextRequest alloc]init];request.recognitionLevel=VNRequestTextRecognitionLevelAccurate;request.recognitionLanguages=@[@"zh-Hans",@"en-US"];request.usesLanguageCorrection=NO;
 NSError *error=nil;VNImageRequestHandler *handler=[[VNImageRequestHandler alloc]initWithCGImage:im options:@{}];[handler performRequests:@[request] error:&error];
 NSMutableArray *lines=[NSMutableArray array];for(VNRecognizedTextObservation *obs in request.results){VNRecognizedText *t=[[obs topCandidates:1]firstObject];if(!t)continue;CGRect b=obs.boundingBox;[lines addObject:@{@"text":t.string,@"confidence":@(t.confidence),@"bbox":@[@(b.origin.x),@(1-CGRectGetMaxY(b)),@(b.size.width),@(b.size.height)]}];}
 [lines sortUsingComparator:^NSComparisonResult(NSDictionary *a,NSDictionary *b){double ay=[a[@"bbox"][1]doubleValue],by=[b[@"bbox"][1]doubleValue];double av=fabs(ay-by)>.008?ay:[a[@"bbox"][0]doubleValue],bv=fabs(ay-by)>.008?by:[b[@"bbox"][0]doubleValue];return av<bv?NSOrderedAscending:av>bv?NSOrderedDescending:NSOrderedSame;}];
 NSMutableDictionary *result=[@{@"page":@(n),@"pageCount":@(doc.pageCount),@"width":@(w),@"height":@(h),@"nativeText":page.string?:@"",@"lines":lines,@"engine":@"PDFKit+Vision"}mutableCopy];if(error)result[@"error"]=error.localizedDescription;
 [[NSJSONSerialization dataWithJSONObject:result options:NSJSONWritingPrettyPrinted|NSJSONWritingSortedKeys error:nil]writeToFile:target atomically:YES];
 CGImageRelease(im);CGContextRelease(ctx);printf("page %ld/%ld: %lu lines\n",n,doc.pageCount,(unsigned long)lines.count);fflush(stdout);
 }}return 0;}}
