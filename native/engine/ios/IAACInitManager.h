// IAACInitManager.h
#import <Foundation/Foundation.h>
#include "cocos/bindings/jswrapper/SeApi.h"
@interface IAACInitManager : NSObject

+ (instancetype)iaacf_shared;

@property (nonatomic, assign) bool didFinishLaunchWithOptions;
@property (nonatomic, copy) NSDictionary *launchOptions;

// 保存 JSB 回调
@property (nonatomic, assign) se::Value userAttributeCallback;
@property (nonatomic, assign) se::Value adInitCallback;

@end
