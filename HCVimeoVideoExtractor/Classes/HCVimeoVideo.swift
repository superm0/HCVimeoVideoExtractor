//
//  HCVimeoVideo.swift
//  HCVimeoVideoExtractor
//
//  Created by Mo Cariaga on 13/02/2018.
//

import UIKit

enum HCVimeoVideoQuality {
    case low
    case medium
    case high
    case best
}

class HCVimeoVideo: NSObject {
    var title = ""
    var videoURL:URL?
    var thumbnailURL:URL?
    var quality:HCVimeoVideoQuality = .best
}
