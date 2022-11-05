//
// HCVimeoVideoExtractor.swift
// HCVimeoVideoExtractor
//
// Created by Mo Cariaga on 13/02/2018.
// Copyright (c) 2018 Mo Cariaga <hermoso.cariaga@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

#if canImport(UIKit)
import UIKit

public class HCVimeoVideoExtractor: NSObject {
    fileprivate static let domain = "ph.hercsoft.HCVimeoVideoExtractor"
    fileprivate let configURL = "https://player.vimeo.com/video/{id}/config"
    fileprivate var completion: ((_ video: HCVimeoVideo?, _ error:Error?) -> Void)?
    fileprivate var videoId: String = ""
    
    
    public static func fetchVideoURLFrom(url: URL, completion: @escaping (_ video: HCVimeoVideo?, _ error:Error?) -> Void) -> Void {
        let videoId = url.lastPathComponent
        if videoId != "" {
            let videoExtractor = HCVimeoVideoExtractor(id: videoId)
            videoExtractor.completion = completion
            videoExtractor.start()
        }
        else {
            completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:0, userInfo:[NSLocalizedDescriptionKey :  "Invalid video id" , NSLocalizedFailureReasonErrorKey : "Failed to parse the video id"]))
        }
    }
    
    public static func fetchVideoURLFrom(id: String, completion: @escaping (_ video: HCVimeoVideo?, _ error:Error?) -> Void) -> Void {
        if id != "" {
            let videoExtractor = HCVimeoVideoExtractor(id: id)
            videoExtractor.completion = completion
            videoExtractor.start()
        }
        else {
            completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:0, userInfo:[NSLocalizedDescriptionKey :  "Invalid video id" , NSLocalizedFailureReasonErrorKey : "Invalid video id"]))
        }
    }
    
    private init(id: String) {
        videoId = id
        completion = nil
        super.init()
    }
    
    private func start() -> Void {
        
        guard let completion = completion else {
            print("ERROR: Invalid completion handler")
            return
        }
        
        if videoId == "" {
            completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:0, userInfo:[NSLocalizedDescriptionKey :  "Invalid video id" , NSLocalizedFailureReasonErrorKey : "Invalid video id"]))
            return
        }
        
        let dataURL = configURL.replacingOccurrences(of: "{id}", with: videoId)
        if let url = URL(string: dataURL) {
            let urlRequest = URLRequest(url: url)
            let session = URLSession.shared
            
            let task = session.dataTask(with: urlRequest, completionHandler: { (data, response, error) in
                
                guard error == nil else {
                    completion(nil, error)
                    return
                }
                
                guard let responseData = data else {
                    completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:2, userInfo:[NSLocalizedDescriptionKey :  "Invalid response" , NSLocalizedFailureReasonErrorKey : "Invalid response from Vimeo"]))
                    return
                }
                
                do {
                    guard let data = try JSONSerialization.jsonObject(with: responseData, options: []) as? [String: AnyObject] else {
                        completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:3, userInfo:[NSLocalizedDescriptionKey :  "Invalid response" , NSLocalizedFailureReasonErrorKey : "Failed to parse Vimeo response"]))
                        return
                    }
                    
                  let video = HCVimeoVideo()
                  if let title = (data as NSDictionary).value(forKeyPath: "video.title") as? String {
                    video.title = title
                  }
                  
                  if let thumbnails = (data as NSDictionary).value(forKeyPath: "video.thumbs") as? Dictionary<String,Any> {
                    for (quality, url) in thumbnails {
                      if let turl = url as? String {
                        video.thumbnailURL[self.thumbnailQualityWith(string: quality)] = URL(string: turl)
                      }
                    }
                  }
                  
                    if let files = (data as NSDictionary).value(forKeyPath: "request.files.progressive") as? Array<Dictionary<String,Any>> {
                      if files.count > 0 {
                        for file in files {
                          if let quality = file["quality"] as? String {
                            if let url = file["url"] as? String {
                              video.videoURL[self.videoQualityWith(string: quality)] = URL(string: url)
                            }
                          }
                        }
                      }
                      else {
                        if let hls = (data as NSDictionary).value(forKeyPath: "request.files.hls.cdns") as? [String: AnyObject],
                           let url = hls.first?.value["url"] as? String {
                            video.videoURL[.quality1080p] = URL(string: url)
                            video.videoURL[.qualityUnknown] = URL(string: url)
                        }
                      }
                        
                        if video.videoURL.count > 0 {
                            completion(video, nil)
                        }
                        else {
                            completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:5, userInfo:[NSLocalizedDescriptionKey :  "Failed to retrive mp4 video url" , NSLocalizedFailureReasonErrorKey : "Failed to retrive mp4 video url"]))
                        }
                    }
                    else {
                        completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:4, userInfo:[NSLocalizedDescriptionKey :  "Failed to retrive mp4 video url" , NSLocalizedFailureReasonErrorKey : "Failed to retrive mp4 video url"]))
                    }
                } catch  {
                    completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:3, userInfo:[NSLocalizedDescriptionKey :  "Failed to parse Vimeo response" , NSLocalizedFailureReasonErrorKey : "Failed to parse Vimeo response"]))
                    return
                }
            })
            task.resume()
        }
        else {
            completion(nil, NSError(domain: HCVimeoVideoExtractor.domain, code:1, userInfo:[NSLocalizedDescriptionKey :  "Failed to retrieve video URL" , NSLocalizedFailureReasonErrorKey : "Failed to retrieve video URL"]))
        }
    }
 
    private func videoQualityWith(string: String) -> HCVimeoVideoQuality {
        return HCVimeoVideoQuality(rawValue: string) ?? .qualityUnknown
    }
    
    private func thumbnailQualityWith(string: String) -> HCVimeoThumbnailQuality {
        return HCVimeoThumbnailQuality(rawValue: string) ?? .qualityUnknown
    }
}
#endif
