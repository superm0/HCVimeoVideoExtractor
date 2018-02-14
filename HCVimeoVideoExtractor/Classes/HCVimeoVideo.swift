//
//  HCVimeoVideo.swift
//  HCVimeoVideoExtractor
//
//  Created by Mo Cariaga on 13/02/2018.
//

import UIKit

enum HCVimeoVideoQuality: String {
    case low = "360p"
    case medium = "540p"
    case high = "720p"
    case best = "1080p"
}

public class HCVimeoVideo: NSObject {
    
    var title = ""
    var videoURL:URL?
    var thumbnailURL:URL?
    var quality:HCVimeoVideoQuality = .best
}
