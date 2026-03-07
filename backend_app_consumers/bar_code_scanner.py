import cv2
from pyzbar import pyzbar

class MobileCamera:
    def getVideo(self, camera_url):
        self.camera_url = camera_url

        # Open the video stream
        cap = cv2.VideoCapture(self.camera_url)

        # Check if the video stream was opened successfully
        if not cap.isOpened():
            print(f"Error: Unable to open video stream from {self.camera_url}")
            return

        while True:
            # Capture frame-by-frame
            ret, frame = cap.read()

            # Check if the frame was captured successfully
            if not ret:
                print("Error: Unable to capture video frame")
                break

            # Resize the frame (if frame was captured)
            frame = cv2.resize(frame, (0, 0), fx=0.50, fy=0.50)

            # Display the resulting frame
            cv2.imshow("Mobile Cam", frame)

            # Exit on pressing 'q'
            if cv2.waitKey(1) == ord('q'):
                break

        # Release the capture and close any open windows
        cap.release()
        cv2.destroyAllWindows()

# Create an instance of MobileCamera and open the stream
cam = MobileCamera()
# cam.getVideo("http://192.168.246.235:8080/video")


#open IP webcam in mobile and hotspot
#then url will be this ::--

def scan_barcodes(url):
    # Open video stream
    cap = cv2.VideoCapture(url)

    # Check if the video stream was opened successfully
    if not cap.isOpened():
        print(f"Error: Could not open video stream from {url}")
        return None

    while True:
        # Read a frame from the video stream
        ret, frame = cap.read()

        # Check if the frame was captured successfully
        if not ret:
            print("Error: Could not read frame")
            break

        # Resize the frame
        frame = cv2.resize(frame, (0, 0), fx=0.50, fy=0.50)

        # Display text to indicate how to quit
        cv2.putText(frame, "Press 'q' to close camera", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 100), 2)

        # Decode barcodes in the frame
        barcodes = pyzbar.decode(frame)

        # Loop through all detected barcodes
        for barcode in barcodes:
            # Get the barcode bounding box location and draw it
            (x, y, w, h) = barcode.rect
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)

            # Get the barcode data and type
            barcodeData = barcode.data.decode("utf-8")
            barcodeType = barcode.type

            # Display the barcode data and type on the frame
            text = f"{barcodeData} ({barcodeType})"
            cv2.putText(frame, text, (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            # Return the barcode data as soon as it is detected
            cap.release()
            cv2.destroyAllWindows()
            return barcodeData

        # Display the frame
        cv2.imshow("Barcode Scanner", frame)

        # Break the loop if 'q' is pressed
        if cv2.waitKey(1) == ord('q'):
            break

    # Release the capture and close all OpenCV windows
    cap.release()
    cv2.destroyAllWindows()

    return None  # Return None if no barcode was detected or 'q' was pressed

print(scan_barcodes("http://192.168.246.235:8080/video"))



# def scan_barcode():
#     # Initialize the video capture
#     cap = cv2.VideoCapture(0)
#     barcode_data = None
#
#     while True:
#         ret, frame = cap.read()
#
#         if not ret:
#             print("Failed to grab frame")
#             break
#
#         # Detect barcodes in the frame
#         barcodes = pyzbar.decode(frame)
#
#         for barcode in barcodes:
#             # Extract the barcode data and convert it to a string
#             barcode_data = barcode.data.decode('utf-8')
#
#             # Draw a rectangle around the detected barcode
#             (x, y, w, h) = barcode.rect
#             cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
#
#             # Display the barcode data on the frame
#             cv2.putText(frame, barcode_data, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX,
#                         0.5, (0, 255, 0), 2)
#
#             # Break once we successfully detect a barcode and decode its data
#             if barcode_data:
#                 break
#
#         # Display the video feed with the barcode detection
#         cv2.imshow('Barcode Scanner', frame)
#
#         # Break the loop when 'q' is pressed
#         if cv2.waitKey(1) == ord('q') or barcode_data:
#             break
#
#     # Release the video capture and close windows
#     cap.release()
#     cv2.destroyAllWindows()
#
#     return barcode_data


# Run the function and store the scanned data
# scanned_data = scan_barcode()
# print(f"Scanned barcode data: {scanned_data}")
