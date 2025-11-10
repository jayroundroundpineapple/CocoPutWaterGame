#import <Foundation/Foundation.h>

typedef void (*IAAUserAttributeResultCallback)(bool attributed, const char* infoJson);
typedef void (*IAAAdInitResultCallback)(bool initialized);

static IAAUserAttributeResultCallback _userAttributeCallback = NULL;
static IAAAdInitResultCallback _adInitCallback = NULL;

@interface IAACInitManager : NSObject

+ (instancetype)iaacf_shared;

@property (nonatomic, assign) bool didFinishLaunchWithOptions;
@property (nonatomic, copy) NSDictionary *launchOptions;

@end
