cmake_minimum_required(VERSION 3.8)

set(CMAKE_SYSTEM_NAME iOS)
set(APP_NAME "waterdemo"  CACHE STRING "Project Name")

project(${APP_NAME} CXX)

set(CC_PROJECT_DIR ${CMAKE_CURRENT_LIST_DIR})
set(CC_UI_RESOURCES)
set(CC_PROJ_SOURCES)
set(CC_ASSET_FILES)
set(CC_COMMON_SOURCES)
set(CC_ALL_SOURCES)

include(${CC_PROJECT_DIR}/../common/CMakeLists.txt)
set(EXECUTABLE_NAME ${APP_NAME}-mobile)

cc_ios_before_target(${EXECUTABLE_NAME})
add_executable(${EXECUTABLE_NAME} ${CC_ALL_SOURCES})

# 设置源文件属性，确保文件出现在 Xcode 项目中
if(CMAKE_SYSTEM_NAME STREQUAL "iOS")
    get_filename_component(NATIVE_IOS_DIR "${CMAKE_CURRENT_LIST_DIR}/../../ios" ABSOLUTE)
    
    # 为每个源文件设置 Xcode 属性，确保它们出现在项目导航器中
    set(IAA_SDK_FILES
        ${NATIVE_IOS_DIR}/IAACoreAdsJSB.mm
        ${NATIVE_IOS_DIR}/IAACoreAdsJSB.h
        ${NATIVE_IOS_DIR}/IAACInitManager.mm
        ${NATIVE_IOS_DIR}/IAACInitManager.h
        ${NATIVE_IOS_DIR}/IAACHelper.h
    )
    
    foreach(file ${IAA_SDK_FILES})
        if(EXISTS ${file})
            # 设置文件属性，确保在 Xcode 中可见
            set_source_files_properties(${file} PROPERTIES
                XCODE_FILE_ATTRIBUTES "Public"
            )
        endif()
    endforeach()
endif()

# 添加 IAA SDK Framework 链接
set(IAA_FRAMEWORK_DIR "${CMAKE_CURRENT_LIST_DIR}/../../ios/Frameworks")
set(PIXELINSIGHT_FRAMEWORK "${IAA_FRAMEWORK_DIR}/PixelInsight.xcframework")

if(EXISTS "${PIXELINSIGHT_FRAMEWORK}")
    # 设置 Framework Search Paths（Xcode 项目属性）
    set_target_properties(${EXECUTABLE_NAME} PROPERTIES
        XCODE_ATTRIBUTE_FRAMEWORK_SEARCH_PATHS "$(inherited) ${IAA_FRAMEWORK_DIR}"
    )
    
    # 对于 xcframework，需要直接链接路径
    # 注意：CMake 可能不支持直接链接 xcframework，需要在 Xcode 中手动添加
    # 这里设置变量供后续使用
    set(IAA_FRAMEWORKS ${PIXELINSIGHT_FRAMEWORK})
    
    message(STATUS "IAA SDK Framework found: ${PIXELINSIGHT_FRAMEWORK}")
    message(STATUS "Framework Search Path: ${IAA_FRAMEWORK_DIR}")
    message(WARNING "注意：xcframework 可能需要在 Xcode 中手动添加到 'Frameworks, Libraries, and Embedded Content'")
else()
    message(WARNING "IAA SDK Framework not found at: ${PIXELINSIGHT_FRAMEWORK}")
    message(WARNING "请确保 PixelInsight.xcframework 位于: native/ios/Frameworks/")
endif()

cc_ios_after_target(${EXECUTABLE_NAME})
