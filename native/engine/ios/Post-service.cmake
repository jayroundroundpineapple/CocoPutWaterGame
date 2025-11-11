# Supported for Cocos Service!

# 添加 IAA SDK Framework 链接配置
if(CMAKE_SYSTEM_NAME STREQUAL "iOS")
    # 获取 native/ios/Frameworks 目录的绝对路径
    get_filename_component(NATIVE_IOS_FRAMEWORKS_DIR "${CMAKE_CURRENT_LIST_DIR}/../../ios/Frameworks" ABSOLUTE)
    
    # 设置 Framework Search Paths
    set(FRAMEWORK_SEARCH_PATHS ${FRAMEWORK_SEARCH_PATHS} ${NATIVE_IOS_FRAMEWORKS_DIR})
    
    # 添加 PixelInsight.xcframework
    set(PIXELINSIGHT_FRAMEWORK_PATH "${NATIVE_IOS_FRAMEWORKS_DIR}/PixelInsight.xcframework")
    if(EXISTS ${PIXELINSIGHT_FRAMEWORK_PATH})
        # 在 cc_ios_after_target 中会处理 Framework 链接
        # 这里先设置变量，供后续使用
        set(IAA_FRAMEWORKS ${IAA_FRAMEWORKS} ${PIXELINSIGHT_FRAMEWORK_PATH})
        message(STATUS "IAA SDK Framework found: ${PIXELINSIGHT_FRAMEWORK_PATH}")
    else()
        message(WARNING "IAA SDK Framework not found at: ${PIXELINSIGHT_FRAMEWORK_PATH}")
    endif()
endif()