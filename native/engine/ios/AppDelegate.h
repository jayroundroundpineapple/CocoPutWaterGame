#pragma once

#import "platform/ios/AppDelegateBridge.h"
#import <UIKit/UIKit.h>

@class ViewController;

@interface AppDelegate : NSObject <UIApplicationDelegate> {
}

@property(nonatomic, readonly) ViewController *viewController;
@property(nonatomic, readonly) AppDelegateBridge *appDelegateBridge;
@end
