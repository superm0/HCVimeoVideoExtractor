

# HCVimeoVideoExtractor

HCVimeoVideoExtractor is an easy to use Swift library for retrieving the Vimeo video details like title, thumbnail and mp4 URL which then can be used to play using AVPlayerView.

<br>

## Requirements

HCVimeoVideoExtractor requires iOS 9.0 and Swift 3.2 and above

<br>

## Installation


### CocoaPods

HCVimeoVideoExtractor is available through [CocoaPods](http://cocoapods.org). To install
it, simply add the following line to your Podfile:

```ruby
pod 'HCVimeoVideoExtractor'
```

and run `pod install`


<br>

### Swift Package Manager
For [Swift Package Manager](https://swift.org/package-manager/) add the following package to your Package.swift file. 

```swift
.package(url: "https://github.com/superm0/HCVimeoVideoExtractor.git", .upToNextMajor(from: "0.0.3")),
```

<br>

## Usage

Use the block based methods in `HCVimeoVideoExtractor` class to retrieve the Vimeo video details. Both methods will call a completion handler with two parameters. The first parameter is a `HCVimeoVideo` object which represents a Vimeo video. The second parameter is an `Error` object describing the network connection or internal processing error. 

```swift
import HCVimeoVideoExtractor
```

Retrieve the Vimeo video details using URL

```swift
let url = URL(string: "https://vimeo.com/[video_id]")!
HCVimeoVideoExtractor.fetchVideoURLFrom(url: url, completion: { ( video:HCVimeoVideo?, error:Error?) -> Void in                
    if let err = error {                    
        print("Error = \(err.localizedDescription)")                    
        return
    }
    
    guard let vid = video else {
        print("Invalid video object")
        return
    }
    
    print("Title = \(vid.title), url = \(vid.videoURL), thumbnail = \(vid.thumbnailURL)")
        
    if let videoURL = vid.videoURL[.Quality1080p] {
        let player = AVPlayer(url: videoURL)
        let playerController = AVPlayerViewController()
        playerController.player = player
        self.present(playerController, animated: true) {
            player.play()
        }
    }                            
})
```
Retrieve the Vimeo video details using video ID
```swift
HCVimeoVideoExtractor.fetchVideoURLFrom(id: "video_id", completion: { ( video:HCVimeoVideo?, error:Error?) -> Void in
    if let err = error {
        print("Error = \(err.localizedDescription)")
        return
    }
    
    guard let vid = video else {
        print("Invalid video object")
        return
    }
    
    print("Title = \(vid.title), url = \(vid.videoURL), thumbnail = \(vid.thumbnailURL)")
    
    if let videoURL = vid.videoURL[.quality1080p] {
        let player = AVPlayer(url: videoURL)
        let playerController = AVPlayerViewController()
        playerController.player = player
        self.present(playerController, animated: true) {
            player.play()
        }
    }
})
```

## New Vimeo Videos
For new Vimeo videos, starting October 2022, the video URL can be retrieved through ```.quality1080p``` or ```.qualityUnknown```.

## Author

Mo Cariaga, hermoso.cariaga@gmail.com

## License

HCVimeoVideoExtractor is available under the MIT license. See the LICENSE file for more info.
