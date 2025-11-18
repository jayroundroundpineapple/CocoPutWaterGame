#import "ViewController.h"
#import "AppDelegate.h"
#import "platform/ios/AppDelegateBridge.h"
//#include "cocos/platform/Device.h"

namespace {
//    cc::Device::Orientation _lastOrientation;
}

@interface ViewController ()
 
@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    NSLog(@"[ViewController] ========== viewDidLoad 开始 ==========");
    NSLog(@"[ViewController] 当前线程：%@，是否主线程：%d", [NSThread currentThread], [NSThread isMainThread]);
    NSLog(@"[ViewController] ========== viewDidLoad 完成 ==========");
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    NSLog(@"[ViewController] ========== viewWillAppear 开始 ==========");
    NSLog(@"[ViewController] 当前线程：%@，是否主线程：%d", [NSThread currentThread], [NSThread isMainThread]);
    NSLog(@"[ViewController] ========== viewWillAppear 完成 ==========");
}

- (BOOL) shouldAutorotate {
    return YES;
}

//fix not hide status on ios7
- (BOOL)prefersStatusBarHidden {
    return YES;
}

// Controls the application's screen edge gesture delay to prevent accidental touches
- (UIRectEdge)preferredScreenEdgesDeferringSystemGestures
{
    return UIRectEdgeAll;
}

// Controls the application's preferred home indicator auto-showing otherwise preferredScreenEdgesDeferringSystemGestures is invalidation
- (BOOL)prefersHomeIndicatorAutoHidden {
    return NO;
}

- (void)viewWillTransitionToSize:(CGSize)size withTransitionCoordinator:(id<UIViewControllerTransitionCoordinator>)coordinator {
   AppDelegate* delegate = [[UIApplication sharedApplication] delegate];
   [delegate.appDelegateBridge viewWillTransitionToSize:size withTransitionCoordinator:coordinator];
   float pixelRatio = [delegate.appDelegateBridge getPixelRatio];

   //CAMetalLayer is available on ios8.0, ios-simulator13.0.
    dispatch_async(dispatch_get_main_queue(),^{
        CAMetalLayer *layer = (CAMetalLayer *)self.view.layer;
        CGSize tsize             = CGSizeMake(static_cast<int>(size.width * pixelRatio),
                                              static_cast<int>(size.height * pixelRatio));
        layer.drawableSize = tsize;
    });
}

@end
