import time
import board
from digitalio import DigitalInOut, Pull, Direction
from adafruit_debouncer import Debouncer

input_pins = (board.A0, board.A1, board.A2, board.A3, board.A4, board.A5, board.RX, board.TX,)
inputs = []

output_pins = (board.SCL, board.D5, board.D6, board.D9, board.D10, board.D11, board.D12, board.D13)
outputs = []


for pin in input_pins:   # set up each pin
    tmp_pin = DigitalInOut(pin) # defaults to input
    tmp_pin.pull = Pull.UP      # turn on internal pull-up resistor
    inputs.append( Debouncer(tmp_pin) )
    
for pin in output_pins:
    tmp_pin = DigitalInOut(pin)
    tmp_pin.direction = Direction.OUTPUT
    outputs.append(tmp_pin)
    
class USBSerialReader:
    """ Read a line from USB Serial (up to end_char), non-blocking, with optional echo """
    def __init__(self):
        self.s = ''
    def read(self,end_char='\n', echo=True):
        import sys, supervisor
        n = supervisor.runtime.serial_bytes_available
        if n > 0:                    # we got bytes!
            s = sys.stdin.read(n)    # actually read it in
            if echo: sys.stdout.write(s)  # echo back to human
            self.s = self.s + s      # keep building the string up
            if s.endswith(end_char): # got our end_char!
                rstr = self.s        # save for return
                self.s = ''          # reset str to beginning
                return rstr
        return None                  # no end_char yet

usb_reader = USBSerialReader()


while True:
    recived_str = usb_reader.read(echo=False)  # read until newline, echo back chars
    if recived_str:
        list = recived_str[:-1].split(" ")
        if len(list) == 2:
            cam = int(list[0])
            state = int(list[1])
            if(cam < (len(outputs)+1) and (state == 0 or state == 1)):
                outputs[cam-1].value = state and True or False
                print("X", cam, state)
    time.sleep(0.01)  # do something time critical
    
    for i in range((len(inputs))):
        inputs[i].update()
        if inputs[i].fell:
            #outputs[i].value = True
            print(i+1,"1")
        if inputs[i].rose:
            #outputs[i].value = False
            print(i+1,"0")
