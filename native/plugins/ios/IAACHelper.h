#ifndef IAACHelper_h
#define IAACHelper_h

#import <Foundation/Foundation.h>
// 引入 Cocos JSB 头文件
#include "cocos/bindings/jswrapper/SeApi.h"

// --- 原有工具函数（保留） ---
static NSString* CreateNSString(const char* string) {
    return string ? [NSString stringWithUTF8String:string] : nil;
}

static const char* CStringCopy(NSString* string) {
    if (string == nil) {
        return NULL;
    }
    const char* utf8String = [string UTF8String];
    char* res = (char*)malloc(strlen(utf8String) + 1);
    strcpy(res, utf8String);
    return res;
}

static const char* DictionaryToJSON(NSDictionary* dict) {
    if (dict == nil) {
        return NULL;
    }
    NSError* error;
    NSData* jsonData = [NSJSONSerialization dataWithJSONObject:dict options:0 error:&error];
    if (!jsonData) {
        NSLog(@"[Bridge] Dictionary to JSON conversion error: %@", error);
        return NULL;
    }
    NSString* jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return CStringCopy(jsonString);
}

static NSDictionary* JSONToDictionary(const char* jsonString) {
    if (jsonString == NULL) {
        return nil;
    }
    NSData* data = [CreateNSString(jsonString) dataUsingEncoding:NSUTF8StringEncoding];
    NSError* error;
    id jsonObject = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    if (error || ![jsonObject isKindOfClass:[NSDictionary class]]) {
        NSLog(@"[Bridge] JSON to Dictionary conversion error: %@", error);
        return nil;
    }
    return (NSDictionary*)jsonObject;
}

// --- JSB 新增工具函数（TS 回调与原生转换） ---
// se::Value（TS 回调）转 NSString（日志用）
static NSString* SeValueToNSString(const se::Value& val) {
    if (val.isString()) {
        return CreateNSString(val.toString().c_str());
    } else if (val.isObject()) {
        se::Object* obj = val.toObject();
        if (obj && obj->isFunction()) {
            return @"[JS Function]";
        }
        return @"[JS Object]";
    }
    return @"[Unknown JS Value]";
}

// 主线程执行 JS 回调（避免线程安全问题）
static void DispatchToMainThread(void (^block)(void)) {
    if ([NSThread isMainThread]) {
        block();
    } else {
        dispatch_async(dispatch_get_main_queue(), block);
    }
}

#endif /* IAACHelper_h */
