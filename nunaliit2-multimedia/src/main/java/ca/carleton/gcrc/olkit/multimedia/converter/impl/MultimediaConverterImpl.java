package ca.carleton.gcrc.olkit.multimedia.converter.impl;

import java.io.File;

import org.apache.log4j.Logger;

import ca.carleton.gcrc.olkit.multimedia.converter.MultimediaConversionProgress;
import ca.carleton.gcrc.olkit.multimedia.converter.MultimediaConversionRequest;
import ca.carleton.gcrc.olkit.multimedia.converter.MultimediaConversionThreshold;
import ca.carleton.gcrc.olkit.multimedia.converter.MultimediaConverter;
import ca.carleton.gcrc.olkit.multimedia.converter.threshold.DefaultThresholdAudio;
import ca.carleton.gcrc.olkit.multimedia.converter.threshold.DefaultThresholdImage;
import ca.carleton.gcrc.olkit.multimedia.converter.threshold.DefaultThresholdVideo;
import ca.carleton.gcrc.olkit.multimedia.ffmpeg.FFmpeg;
import ca.carleton.gcrc.olkit.multimedia.ffmpeg.FFmpegMediaInfo;
import ca.carleton.gcrc.olkit.multimedia.ffmpeg.FFmpegProcessor;
import ca.carleton.gcrc.olkit.multimedia.imageMagick.ImageInfo;
import ca.carleton.gcrc.olkit.multimedia.imageMagick.ImageMagick;
import ca.carleton.gcrc.olkit.multimedia.imageMagick.ImageMagickInfo;
import ca.carleton.gcrc.olkit.multimedia.imageMagick.ImageMagickProcessor;

public class MultimediaConverterImpl implements MultimediaConverter {

	static public int IMAGE_MAX_WIDTH = 500;
	static public int IMAGE_MAX_HEIGHT = 500;
	static public int IMAGE_THUMB_HEIGHT = 60;
	static public int IMAGE_THUMB_WIDTH = 60;
	static public int VIDEO_THUMB_HEIGHT = 60;
	static public int VIDEO_THUMB_WIDTH = 80;
	
	static public MultimediaConversionThreshold imageConversionThreshold = new DefaultThresholdImage();
	static public MultimediaConversionThreshold audioConversionThreshold = new DefaultThresholdAudio();
	static public MultimediaConversionThreshold videoConversionThreshold = new DefaultThresholdVideo();

	final protected Logger logger = Logger.getLogger(this.getClass());

	@Override
	public void convertVideo(MultimediaConversionRequest request) throws Exception {
		request.setConversionPerformed(false);
		request.setThumbnailCreated(false);

		File inFile = request.getInFile();
		if( null == inFile ) {
			throw new Exception("Must provide a file for video conversion");
		}
		
		MultimediaConversionProgress progress = request.getProgress();
		if( null == progress ) {
			progress = MultimediaConversionProgressNull.getSingleton();
		}
		
		// Get information about video
		FFmpegMediaInfo videoInfo = null;
		{
			FFmpegProcessor ffmpeg = FFmpeg.getProcessor(null);
			videoInfo = ffmpeg.getMediaInfo( inFile );
		}
		
		// Check if conversion is required
		boolean conversionRequired = videoConversionThreshold.isConversionRequired(
				videoInfo.getVideoCodec()
				,videoInfo.getBitRate()
				,videoInfo.getAudioCodec()
				,videoInfo.getBitRate()
				,videoInfo.getWidth()
				,videoInfo.getHeight()
				);
		
		// Report length and dimensions
		request.setInDurationInSec( videoInfo.getDurationInSec() );
		request.setInHeight(videoInfo.getHeight().intValue());
		request.setInWidth(videoInfo.getWidth().intValue());
		
		if( false == conversionRequired ) {
			// Conversion not required, converted file is the uploaded file
			request.setOutFile(inFile);
			progress.updateProgress(100);
		} else {
			File outFile = request.getOutFile();
			if( null == outFile ) {
				File parentDir = inFile.getParentFile();
				outFile = File.createTempFile("conv", ".mp4", parentDir);
			}
			
			FFmpegProcessor ffmpeg = FFmpeg.getProcessor(progress);
			ffmpeg.convertVideo(videoInfo, outFile);
			
			request.setOutFile(outFile);
			request.setConversionPerformed(true);

			FFmpegMediaInfo outVideoInfo = ffmpeg.getMediaInfo( outFile );
			if( null == outVideoInfo.getDurationInSec() ) {
				request.setOutDurationInSec( (float)0.0 );
			} else {
				request.setOutDurationInSec( outVideoInfo.getDurationInSec() );
				request.setOutHeight(outVideoInfo.getHeight().intValue());
				request.setOutWidth(outVideoInfo.getWidth().intValue());
			}
		}
		
		// Create thumbnail
		if( request.isThumbnailRequested() ){
			File thumbnailFile = request.getThumbnailFile();
			if( null == thumbnailFile ) {
				File parentDir = inFile.getParentFile();

				String name = inFile.getName();
				int index = name.lastIndexOf('.');
				if( index > 0 ) {
					name = name.substring(0, index);
				}
				name = name+"_thumb.png";
				
				thumbnailFile = new File(parentDir, name);
			}
			
			FFmpegProcessor ffmpeg = FFmpeg.getProcessor(null);
			ffmpeg.createThumbnail(videoInfo, thumbnailFile, VIDEO_THUMB_WIDTH, VIDEO_THUMB_HEIGHT);
			
			request.setThumbnailFile(thumbnailFile);
			request.setThumbnailCreated(true);

			ImageMagickInfo imInfo = ImageMagick.getInfo();
			ImageMagickProcessor im = imInfo.getProcessor(progress);
			ImageInfo thumbImageInfo = im.getImageInfo( thumbnailFile );
			request.setThumbnailHeight( thumbImageInfo.height );
			request.setThumbnailWidth( thumbImageInfo.width );
		}
	}
	
	@Override
	public void convertAudio(MultimediaConversionRequest request) throws Exception {
		request.setConversionPerformed(false);
		request.setThumbnailCreated(false);

		File inFile = request.getInFile();
		if( null == inFile ) {
			throw new Exception("Must provide a file for audio conversion");
		}
		
		MultimediaConversionProgress progress = request.getProgress();
		if( null == progress ) {
			progress = MultimediaConversionProgressNull.getSingleton();
		}

		// Get information about audio
		FFmpegMediaInfo audioInfo = null;
		{
			FFmpegProcessor ffmpeg = FFmpeg.getProcessor(null);
			audioInfo = ffmpeg.getMediaInfo( inFile );
		}
		
		// Check if conversion is required
		boolean conversionRequired = audioConversionThreshold.isConversionRequired(
				null
				,null
				,audioInfo.getAudioCodec()
				,audioInfo.getBitRate()
				,null
				,null
				);

		// Report length and dimensions
		request.setInDurationInSec( audioInfo.getDurationInSec() );
		
		if( false == conversionRequired ) {
			// Conversion not required, converted file is the uploaded file
			request.setOutFile(inFile);
			progress.updateProgress(100);
		} else {
			File outFile = request.getOutFile();
			if( null == outFile ) {
				File parentDir = inFile.getParentFile();
				outFile = File.createTempFile("conv", ".mp3", parentDir);
			}

			FFmpegProcessor ffmpeg = FFmpeg.getProcessor(progress);
			ffmpeg.convertAudio(audioInfo, outFile);
			
			request.setOutFile(outFile);
			request.setConversionPerformed(true);

			FFmpegMediaInfo outAudioInfo = ffmpeg.getMediaInfo( outFile );
			request.setOutDurationInSec( outAudioInfo.getDurationInSec() );
			request.setOutHeight(0);
			request.setOutWidth(0);
		}
	}
	
	@Override
	public void convertImage(MultimediaConversionRequest request) throws Exception {
		request.setConversionPerformed(false);
		request.setThumbnailCreated(false);

		File inFile = request.getInFile();
		if( null == inFile ) {
			throw new Exception("Must provide a file for image conversion");
		}
		
		MultimediaConversionProgress progress = request.getProgress();
		if( null == progress ) {
			progress = MultimediaConversionProgressNull.getSingleton();
		}

		ImageMagickInfo imInfo = ImageMagick.getInfo();
		
		// Get information about image
		ImageInfo imageInfo = null;
		if( imInfo.isAvailable ){
			ImageMagickProcessor imageMagick = imInfo.getProcessor();
			imageInfo = imageMagick.getImageInfo( inFile );
		}

		boolean conversionRequired = false;
		boolean resizeRequired = false;
		boolean reorientationRequired = false;
		if( null != imageInfo ) {
			request.setInHeight( imageInfo.height );
			request.setInWidth( imageInfo.width );

			// Check if conversion is required
			conversionRequired = imageConversionThreshold.isConversionRequired(
					imageInfo.format
					,null
					,null
					,null
					,new Long(imageInfo.width)
					,new Long(imageInfo.height)
					);
			resizeRequired = imageConversionThreshold.isResizeRequired(
					new Long(imageInfo.width)
					,new Long(imageInfo.height)
					);
			
			if( imageInfo.orientation == ImageInfo.Orientation.REQUIRES_CONVERSION ) {
				reorientationRequired = true;
			}
		}
		
		if( false == conversionRequired 
		 && false == resizeRequired 
		 && false == reorientationRequired 
		 ) {
			// Conversion not required, converted file is the uploaded file
			// Same applies if conversion is impossible because ImageMagick
			// is not present.
			request.setOutFile(inFile);
			progress.updateProgress(100);
		} else {
			File outFile = request.getOutFile();
			if( null == outFile ) {
				File parentDir = inFile.getParentFile();
				outFile = File.createTempFile("conv", ".jpg", parentDir);
			}
			
			ImageMagickProcessor im = imInfo.getProcessor(progress);
			if( resizeRequired ) {
				im.resizeImage(imageInfo, outFile, IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT);
			} else if(conversionRequired) {
				im.convertImage(imageInfo, outFile);
			} else {
				im.reorientImage(imageInfo, outFile);
			}
			
			request.setOutFile(outFile);
			request.setConversionPerformed(true);

			ImageInfo outImageInfo = im.getImageInfo( outFile );
			request.setOutHeight( outImageInfo.height );
			request.setOutWidth( outImageInfo.width );
		}
		
		// Create thumbnail
		if( null != imageInfo && request.isThumbnailRequested() ){
			File thumbnailFile = request.getThumbnailFile();
			if( null == thumbnailFile ) {
				File parentDir = inFile.getParentFile();

				String name = inFile.getName();
				int index = name.lastIndexOf('.');
				if( index > 0 ) {
					name = name.substring(0, index);
				}
				name = name+"_thumb.png";
				
				thumbnailFile = new File(parentDir, name);
			}

			ImageMagickProcessor im = imInfo.getProcessor(progress);
			im.resizeImage(imageInfo, thumbnailFile, IMAGE_THUMB_WIDTH, IMAGE_THUMB_HEIGHT);
			
			request.setThumbnailFile(thumbnailFile);
			request.setThumbnailCreated(true);

			ImageInfo thumbImageInfo = im.getImageInfo( thumbnailFile );
			request.setThumbnailHeight( thumbImageInfo.height );
			request.setThumbnailWidth( thumbImageInfo.width );
		}
	}

	@Override
	public void createImageThumbnail(MultimediaConversionRequest request) throws Exception {
		request.setConversionPerformed(false);
		request.setThumbnailCreated(false);

		File inFile = request.getInFile();
		if( null == inFile ) {
			throw new Exception("Must provide a file for image conversion");
		}
		
		MultimediaConversionProgress progress = request.getProgress();
		if( null == progress ) {
			progress = MultimediaConversionProgressNull.getSingleton();
		}

		ImageMagickInfo imInfo = ImageMagick.getInfo();
		
		// Get information about image
		ImageInfo imageInfo = null;
		if( imInfo.isAvailable ){
			ImageMagickProcessor imageMagick = imInfo.getProcessor();
			imageInfo = imageMagick.getImageInfo( inFile );
		}

		if( null != imageInfo ) {
			request.setInHeight( imageInfo.height );
			request.setInWidth( imageInfo.width );
		}
		
		// Create thumbnail
		if( null != imageInfo && request.isThumbnailRequested() ){
			File thumbnailFile = request.getThumbnailFile();
			if( null == thumbnailFile ) {
				File parentDir = inFile.getParentFile();

				String name = inFile.getName();
				int index = name.lastIndexOf('.');
				if( index > 0 ) {
					name = name.substring(0, index);
				}
				name = name+"_thumb.png";
				
				thumbnailFile = new File(parentDir, name);
			}

			ImageMagickProcessor im = imInfo.getProcessor(progress);
			im.resizeImage(imageInfo, thumbnailFile, IMAGE_THUMB_WIDTH, IMAGE_THUMB_HEIGHT);
			
			request.setThumbnailFile(thumbnailFile);
			request.setThumbnailCreated(true);

			ImageInfo thumbImageInfo = im.getImageInfo( thumbnailFile );
			request.setThumbnailHeight( thumbImageInfo.height );
			request.setThumbnailWidth( thumbImageInfo.width );
		}
	}
}