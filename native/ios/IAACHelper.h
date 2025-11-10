#ifndef IAACHelper_h
#define IAACHelper_h

#import <Foundation/Foundation.h>

// --- 工具函数 ---
// C 字符串转 NSString
static NSString* CreateNSString(const char* string) {
    return string ? [NSString stringWithUTF8String:string] : nil;
}

// NSString 转 C 字符串 (需要调用 free() 释放)
static const char* CStringCopy(NSString* string) {
    if (string == nil) {
        return NULL;
    }
    const char* utf8String = [string UTF8String];
    char* res = (char*)malloc(strlen(utf8String) + 1);
    strcpy(res, utf8String);
    return res;
}

// NSDictionary 转 JSON 字符串 (C 字符串)
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

// JSON 字符串 (C 字符串) 转 NSDictionary
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

#endif /* IAACHelper_h */
